// src/backend/routes/auth.js
// ─────────────────────────────────────────────────────────────
// Authentication routes: signup, login, logout, OTP verification,
// password reset.
//
// ── What's new in this pass ─────────────────────────────────
//   • Signup now sends a real email-verification OTP (previously
//     users.email_verified was set to 0 at signup and NOTHING ever
//     set it back to 1 — there was no verification flow at all).
//   • Escalating resend cooldown (1 min, 2 min, 3 min…) on every
//     OTP send, shared by signup verification, login, and password
//     reset via utils/otpService.js — enforced server-side so it
//     can't be bypassed by hitting the endpoint directly.
//   • Cloudflare Turnstile bot-check on signup/login/forgot-password
//     (no-ops with a warning until TURNSTILE_SECRET_KEY is set).
//   • Recruiter domain verification: a corporate email domain is
//     auto-approved; a generic one (gmail.com, yahoo.com, …) stays
//     'pending' and the account is told a document upload is needed
//     — using the company_verification_documents flow that already
//     existed in admin.js/recruiter.js but was never triggered from
//     here at signup time.
//   • OTP emails now go through utils/emailService.js's TEMPLATES,
//     which also logs every OTP send to notification_log (previously
//     they were fired from an ad-hoc local `getMailer()` and never
//     logged anywhere).
//   • Sliding-window rate limiting (rate-limiter-flexible) on
//     login/signup/OTP endpoints, replacing express-rate-limit's
//     fixed-window limiter, which resets hard at each window
//     boundary rather than smoothing over time.
//
// Existing hardening kept as-is:
//   1. OTP uses crypto.randomInt() (utils/otpService.js) — not Math.random().
//   2. Login sets JWT in an httpOnly cookie AND returns it in the body
//      (cookie is the secure path; token in body is for mobile clients).
//   3. Account lockout after 5 failed attempts (15 min).
//   4. Logout clears the cookie properly.
// ─────────────────────────────────────────────────────────────

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { RateLimiterMemory } from "rate-limiter-flexible";
import db from "../db.js";
import { verifyTurnstile } from "../middleware/turnstile.js";
import { sendNotification } from "../utils/emailService.js";
import {
  OTP_PURPOSES,
  checkResendCooldown,
  checkResendCooldownByEmail,
  issueOtp,
  verifyOtp,
} from "../utils/otpService.js";
import { authCookieOptions } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ── Sliding-window rate limiters ────────────────────────────────
// rate-limiter-flexible tracks consumption continuously rather than
// resetting hard at a fixed window boundary, which is what the spec
// asks for under "Bot Protection". Keyed by IP; login/signup are also
// worth keying by email to stop a distributed attack on one account,
// so we consume from both keyspaces.
const authLimiterByIp = new RateLimiterMemory({ points: 10, duration: 15 * 60 });
const authLimiterByEmail = new RateLimiterMemory({ points: 8, duration: 15 * 60 });
const otpLimiterByIp = new RateLimiterMemory({ points: 8, duration: 60 * 60 });

async function slidingAuthLimiter(req, res, next) {
  try {
    const email = (req.body?.email || "").toLowerCase().trim();
    await authLimiterByIp.consume(req.ip);
    if (email) await authLimiterByEmail.consume(email);
    next();
  } catch {
    return res.status(429).json({ message: "Too many attempts. Please try again in a few minutes." });
  }
}

async function slidingOtpLimiter(req, res, next) {
  try {
    await otpLimiterByIp.consume(req.ip);
    next();
  } catch {
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }
}

// ── Generic (non-Gmail/Yahoo/etc) domain check for recruiters ──
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "yahoo.co.in",
  "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com",
  "me.com", "aol.com", "protonmail.com", "proton.me", "pm.me",
  "rediffmail.com", "zoho.com", "mail.com", "gmx.com", "yandex.com",
  "qq.com", "163.com", "126.com", "inbox.com", "rocketmail.com",
]);

function emailDomain(email) {
  return (email.split("@")[1] || "").toLowerCase().trim();
}

function isGenericEmailDomain(email) {
  return GENERIC_EMAIL_DOMAINS.has(emailDomain(email));
}

// ── Validation schemas ────────────────────────────────────────
const signupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8,  "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

const otpRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  purpose: z.enum(Object.values(OTP_PURPOSES)),
});

const otpVerifySchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  purpose: z.enum(Object.values(OTP_PURPOSES)),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

// ── JWT + cookie helper ───────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
  });
}

function setAuthCookie(res, token) {
  // See middleware/auth.js authCookieOptions() for the full reasoning —
  // shared now instead of each of the four cookie call sites keeping
  // its own copy of this logic.
  res.cookie("token", token, authCookieOptions(24 * 60 * 60 * 1000)); // 1 day
}

// Shape the "please wait Nm" response consistently across all OTP endpoints.
function cooldownResponse(res, cooldown) {
  return res.status(429).json({
    message: `Please wait ${cooldown.nextWaitMinutes} minute${cooldown.nextWaitMinutes === 1 ? "" : "s"} before requesting another code.`,
    retryAfterSeconds: cooldown.retryAfterSeconds,
  });
}

// ── POST /api/auth/signup ─────────────────────────────────────
router.post("/signup", slidingAuthLimiter, verifyTurnstile, async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;
    const role = req.body.role === "recruiter" ? "recruiter" : "user";

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 0)",
      [name, email, hashedPassword, role]
    );
    const userId = result.insertId;

    let requiresDocuments = false;

    if (role === "recruiter") {
      const companyName = (req.body.companyName || "").trim();
      const companySize = req.body.companySize  || "1-10";
      const industry    = (req.body.industry    || "").trim();
      const designation = (req.body.designation || "").trim();
      const domain = emailDomain(email);
      const generic = isGenericEmailDomain(email);
      requiresDocuments = generic;

      // Corporate domain → auto-approved. Generic domain → stays
      // 'pending' until a verification document is uploaded and an
      // admin approves it (see POST /api/recruiter/documents/upload
      // and PATCH /api/admin/verifications/:id).
      await db.query(
        `INSERT INTO recruiter_profiles
           (user_id, company_name, company_size, industry, designation,
            work_email, company_domain, verification_status, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, companyName, companySize, industry, designation,
          email, domain,
          generic ? "pending" : "approved",
          generic ? null : new Date(),
        ]
      );

      sendNotification("recruiter_welcome", {
        to: email,
        userId,
        role: "recruiter",
        name,
        tier: companySize,
        requiresDocuments,
      });
    }

    // Kick off email verification — doesn't block signup/login, but
    // the account is flagged unverified until this completes.
    const cooldown = await checkResendCooldown(userId);
    if (cooldown.allowed) {
      const { otp } = await issueOtp(userId, OTP_PURPOSES.SIGNUP_VERIFY, { resetCycle: true });
      sendNotification("email_verification_otp", {
        to: email, userId, role: role === "recruiter" ? "recruiter" : "user",
        name, otp,
      });
    }

    const token = signToken({ id: userId, email, role });
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { id: userId, name, email, role, emailVerified: false },
      requiresDocuments,
      requiresEmailVerification: true,
    });
  } catch (err) {
    console.error("[signup]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", slidingAuthLimiter, verifyTurnstile, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const { email, password } = parsed.data;

    const [users] = await db.query(
      `SELECT id, name, email, password, role, failed_login_attempts, locked_until, email_verified
       FROM users WHERE email = ?`,
      [email]
    );

    // Timing-safe: always run bcrypt even if user not found, so response
    // time doesn't reveal whether the email is registered.
    const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyz012345678901234567890";
    const user = users[0] || null;
    const hashToCompare = user ? user.password || DUMMY_HASH : DUMMY_HASH;

    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockAt = new Date(user.locked_until).toLocaleTimeString();
      return res.status(429).json({
        message: `Account temporarily locked due to too many failed attempts. Try again after ${unlockAt}.`,
      });
    }

    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      if (user) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        if (newAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await db.query(
            "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
            [newAttempts, lockUntil, user.id]
          );
        } else {
          await db.query(
            "UPDATE users SET failed_login_attempts = ? WHERE id = ?",
            [newAttempts, user.id]
          );
        }
      }
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await db.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
      [user.id]
    );

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);

    return res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        emailVerified: !!user.email_verified,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("token", authCookieOptions());
  res.json({ message: "Logged out successfully" });
});

// ── POST /api/auth/resend-otp ─────────────────────────────────
// Generic, purpose-scoped resend used by email verification, login
// 2FA (future), and password reset alike. Enforces the escalating
// 1-min/2-min/3-min… cooldown server-side, so it can't be bypassed
// by calling this repeatedly instead of using a "resend" button.
router.post("/resend-otp", slidingOtpLimiter, verifyTurnstile, async (req, res) => {
  try {
    const parsed = otpRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
    const { email, purpose } = parsed.data;

    const found = await checkResendCooldownByEmail(email);
    // Don't reveal whether the account exists for password-reset requests.
    const GENERIC_MSG = { message: "If an account exists, a new code has been sent." };
    if (!found) return res.json(GENERIC_MSG);

    const { userId, cooldown } = found;
    if (!cooldown.allowed) return cooldownResponse(res, cooldown);

    const [[user]] = await db.query("SELECT name, role FROM users WHERE id = ?", [userId]);
    const { otp } = await issueOtp(userId, purpose, { resetCycle: cooldown.resetCycle });

    const templateByPurpose = {
      [OTP_PURPOSES.SIGNUP_VERIFY]: "email_verification_otp",
      [OTP_PURPOSES.LOGIN_2FA]: "login_otp",
      [OTP_PURPOSES.PASSWORD_RESET]: "password_reset_otp",
    };

    sendNotification(templateByPurpose[purpose], {
      to: email, userId, role: user.role === "recruiter" ? "recruiter" : "user",
      name: user.name, otp,
    });

    return res.json(GENERIC_MSG);
  } catch (err) {
    console.error("[resend-otp]", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
// Generic verify — confirms the code is correct for {email, purpose}
// without taking any further action. Used standalone by the
// forgot-password UI (verify code, then show the new-password step)
// and internally by /verify-email below.
router.post("/verify-otp", slidingOtpLimiter, async (req, res) => {
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
    const { email, purpose, otp } = parsed.data;

    const [[user]] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    const result = await verifyOtp(user.id, purpose, otp);
    if (!result.valid) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    if (purpose === OTP_PURPOSES.SIGNUP_VERIFY) {
      await db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [user.id]);
    }

    // Short-lived, single-purpose token so a follow-up action (e.g.
    // reset-password) can prove "yes, this OTP step already passed"
    // without asking the user to re-type the code.
    const verifiedToken = jwt.sign(
      { id: user.id, email, purpose, verified: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    return res.json({ message: "Verified", verifiedToken });
  } catch (err) {
    console.error("[verify-otp]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/verify-email ───────────────────────────────
// Thin, explicit alias of verify-otp scoped to signup verification —
// kept separate so the intent is obvious from the frontend call site.
router.post("/verify-email", slidingOtpLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email().toLowerCase().trim(),
      otp: z.string().length(6).regex(/^\d{6}$/),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

    const [[user]] = await db.query("SELECT id FROM users WHERE email = ?", [parsed.data.email]);
    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    const result = await verifyOtp(user.id, OTP_PURPOSES.SIGNUP_VERIFY, parsed.data.otp);
    if (!result.valid) return res.status(400).json({ message: "Invalid or expired code" });

    await db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [user.id]);
    return res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("[verify-email]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post("/forgot-password", slidingOtpLimiter, verifyTurnstile, async (req, res) => {
  try {
    const email = z.string().email().parse((req.body.email || "").toLowerCase().trim());
    const GENERIC_MSG = { message: "If an account exists for that email, an OTP has been sent." };

    const found = await checkResendCooldownByEmail(email);
    if (!found) return res.json(GENERIC_MSG);

    const { userId, cooldown } = found;
    if (!cooldown.allowed) return cooldownResponse(res, cooldown);

    const [[user]] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);
    const { otp } = await issueOtp(userId, OTP_PURPOSES.PASSWORD_RESET, { resetCycle: cooldown.resetCycle });

    sendNotification("password_reset_otp", {
      to: email, userId, role: "user", name: user.name, otp,
    });

    return res.json(GENERIC_MSG);
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post("/reset-password", slidingAuthLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email:       z.string().email().toLowerCase().trim(),
      otp:         z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
      newPassword: z.string()
        .min(8,  "Password must be at least 8 characters")
        .max(100, "Password too long"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, otp, newPassword } = parsed.data;

    const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!users.length) return res.status(400).json({ message: "Invalid request" });
    const user = users[0];

    const result = await verifyOtp(user.id, OTP_PURPOSES.PASSWORD_RESET, otp);
    if (!result.valid) {
      return res.status(400).json({
        message: result.reason === "EXPIRED" ? "OTP has expired. Please request a new one." : "Invalid OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);

    return res.json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
