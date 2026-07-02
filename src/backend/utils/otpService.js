// src/backend/utils/otpService.js
// ─────────────────────────────────────────────────────────────
// Centralised OTP generation, verification, and escalating resend
// cooldown — used by signup email verification, login 2FA, and
// password reset so all three share one tested implementation
// instead of three copies that drift apart.
//
// Escalating cooldown ("WhatsApp-style"):
//   1st send   → no wait (first request)
//   1st resend → must wait 1 minute since the previous send
//   2nd resend → must wait 2 minutes since the previous send
//   3rd resend → must wait 3 minutes since the previous send
//   ...
//   nth resend → must wait n minutes since the previous send
//
// The counter resets once a fresh OTP cycle starts (i.e. after a
// successful verification, or after OTP_RESET_AFTER_MS of
// inactivity) so a user isn't punished forever for one busy day.
//
// `purpose` scopes an OTP to what it's allowed to be used for, so
// a code emailed for signup verification can't be replayed against
// password-reset, and vice versa.
// ─────────────────────────────────────────────────────────────

import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../db.js";

export const OTP_PURPOSES = Object.freeze({
  SIGNUP_VERIFY: "signup_verify",
  LOGIN_2FA: "login_2fa",
  PASSWORD_RESET: "password_reset",
});

const OTP_TTL_MS = 10 * 60 * 1000; // OTP itself expires in 10 minutes
const RESEND_UNIT_MS = 60 * 1000; // escalating step size = 1 minute
const MAX_RESEND_WAIT_MS = 15 * 60 * 1000; // cap the wait at 15 minutes
// If it's been this long since the last send, treat the next request
// as a brand-new cycle instead of "yet another resend".
const OTP_RESET_AFTER_MS = 60 * 60 * 1000;

/**
 * Check whether the user is currently allowed to (re)send an OTP.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds, nextWaitMinutes }.
 */
export async function checkResendCooldown(userId) {
  const [rows] = await db.query(
    `SELECT otp_resend_count, otp_last_sent_at FROM users WHERE id = ?`,
    [userId]
  );
  if (!rows.length) return { allowed: false, retryAfterSeconds: 0, nextWaitMinutes: 1 };

  const { otp_resend_count, otp_last_sent_at } = rows[0];
  const count = otp_resend_count || 0;
  const lastSentAt = otp_last_sent_at ? new Date(otp_last_sent_at).getTime() : 0;
  const now = Date.now();

  // First-ever send, or it's been long enough that we treat this as a
  // fresh cycle rather than punishing a returning user.
  if (!lastSentAt || now - lastSentAt > OTP_RESET_AFTER_MS) {
    return { allowed: true, resetCycle: true };
  }

  // count=0 means the previous send was the *first* send of this cycle,
  // so the very next call is "1st resend" → must wait 1 * RESEND_UNIT_MS.
  const requiredWaitMs = Math.min((count + 1) * RESEND_UNIT_MS, MAX_RESEND_WAIT_MS);
  const elapsed = now - lastSentAt;

  if (elapsed < requiredWaitMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((requiredWaitMs - elapsed) / 1000),
      nextWaitMinutes: Math.ceil(requiredWaitMs / RESEND_UNIT_MS),
    };
  }

  return { allowed: true, resetCycle: false };
}

/**
 * Generate a fresh 6-digit OTP, hash it, persist it + bump the resend
 * counter/timestamp. Returns the PLAINTEXT otp so the caller can email it —
 * the plaintext is never stored.
 */
export async function issueOtp(userId, purpose, { resetCycle } = {}) {
  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const [rows] = await db.query(
    `SELECT otp_resend_count FROM users WHERE id = ?`,
    [userId]
  );
  const prevCount = rows[0]?.otp_resend_count || 0;
  const nextCount = resetCycle ? 0 : prevCount + 1;

  await db.query(
    `UPDATE users
     SET otp = ?, otp_expires_at = ?, otp_purpose = ?,
         otp_resend_count = ?, otp_last_sent_at = NOW()
     WHERE id = ?`,
    [otpHash, expiresAt, purpose, nextCount, userId]
  );

  return { otp, expiresAt };
}

/**
 * Verify a submitted OTP against the stored hash for a given purpose.
 * On success, clears the OTP fields so it can't be replayed, and resets
 * the resend counter for the next time this user needs an OTP.
 */
export async function verifyOtp(userId, purpose, submittedOtp) {
  const [rows] = await db.query(
    `SELECT otp, otp_expires_at, otp_purpose FROM users WHERE id = ?`,
    [userId]
  );
  if (!rows.length) return { valid: false, reason: "USER_NOT_FOUND" };

  const { otp, otp_expires_at, otp_purpose } = rows[0];

  if (!otp || !otp_expires_at) return { valid: false, reason: "NO_OTP_PENDING" };
  if (otp_purpose !== purpose) return { valid: false, reason: "WRONG_PURPOSE" };
  if (new Date(otp_expires_at) < new Date()) return { valid: false, reason: "EXPIRED" };

  const matches = await bcrypt.compare(submittedOtp, otp);
  if (!matches) return { valid: false, reason: "INCORRECT" };

  await db.query(
    `UPDATE users
     SET otp = NULL, otp_expires_at = NULL, otp_purpose = NULL, otp_resend_count = 0
     WHERE id = ?`,
    [userId]
  );

  return { valid: true };
}

/**
 * Same cooldown/issue flow, but keyed by email instead of a known user id —
 * used by forgot-password, where the caller shouldn't be told whether the
 * email exists. Returns null (silently) if there's no such user so the
 * route can return its generic "if this account exists…" message either way.
 */
export async function checkResendCooldownByEmail(email) {
  const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (!rows.length) return null;
  return { userId: rows[0].id, cooldown: await checkResendCooldown(rows[0].id) };
}
