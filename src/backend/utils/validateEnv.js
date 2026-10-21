// src/backend/utils/validateEnv.js
// ─────────────────────────────────────────────────────────────
// Validate environment variables at startup.
//
// REQUIRED  — server refuses to boot if any of these are absent.
// WARN_ONLY — server boots but logs a warning and the related
//             feature is disabled/degraded at runtime. This is
//             the right tier for EMAIL_* because:
//             - Render free tier doesn't need email in all envs
//             - It's better to boot without email than crash
//               completely and block every other feature
//             - Email routes already check for the vars and
//               return 503 if missing
// ─────────────────────────────────────────────────────────────

const REQUIRED = [
  "JWT_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "FRONTEND_URL",
];

// These are needed for email OTP / verification emails.
// Missing = email features disabled, NOT a fatal boot error.
const WARN_ONLY = [
  "EMAIL_USER",
  "EMAIL_PASS",
];

// Placeholder values that suggest someone copied a template but
// forgot to fill in the real secrets.
const DANGEROUS_VALUES = ["changeme", "secret", "password", "1234", "test"];

export function validateEnv() {
  const missing = [];

  // ── Hard-required vars ────────────────────────────────────
  for (const key of REQUIRED) {
    if (!process.env[key] || process.env[key].trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n❌ Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
      `\n  Add these to your .env file (development) or Render dashboard (production).\n` +
      `  NEVER commit .env to git.\n`
    );
  }

  // ── JWT strength check ────────────────────────────────────
  const jwt = process.env.JWT_SECRET || "";
  if (jwt.length < 64) {
    throw new Error(
      `JWT_SECRET is too short (${jwt.length} chars). Must be at least 64 characters. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  // ── Placeholder / default value check ────────────────────
  const allRequired = [...REQUIRED, ...WARN_ONLY];
  for (const key of allRequired) {
    const val = process.env[key] || "";
    const lower = val.toLowerCase();
    if (val && DANGEROUS_VALUES.some((d) => lower.includes(d))) {
      console.warn(`⚠️  WARNING: ${key} looks like a placeholder value. Replace it before production.`);
    }
  }

  // ── Warn-only vars (email) ────────────────────────────────
  const missingWarn = WARN_ONLY.filter(
    (key) => !process.env[key] || process.env[key].trim() === ""
  );
  if (missingWarn.length > 0) {
    console.warn(
      `⚠️  Email env vars not set: ${missingWarn.join(", ")}\n` +
      `   Email features (OTP, verification, notifications) will be disabled.\n` +
      `   Add EMAIL_USER and EMAIL_PASS in Render dashboard to enable them.`
    );
  }

  // ── Production Turnstile check ────────────────────────────
  if (process.env.NODE_ENV === "production" && (!process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_SECRET_KEY.trim())) {
    console.warn(
      "⚠️  PRODUCTION WARNING: TURNSTILE_SECRET_KEY is not configured.\n" +
      "   Auth endpoints will fail closed with 503 until TURNSTILE_SECRET_KEY is configured in production."
    );
  }

  console.log("✅ Environment variables validated");
}

// ── Runtime helper ────────────────────────────────────────────
// Call this in any route that needs email before trying to send.
//
//   import { isEmailConfigured } from "../utils/validateEnv.js";
//
//   if (!isEmailConfigured()) {
//     return res.status(503).json({ message: "Email service not configured." });
//   }
//
export function isEmailConfigured() {
  return !!(
    process.env.EMAIL_USER?.trim() &&
    process.env.EMAIL_PASS?.trim()
  );
}