// src/backend/utils/validateEnv.js
// ─────────────────────────────────────────────────────────────
// Crash the server at startup if ANY required environment
// variable is missing or insecure.  Better to crash loudly
// at boot time than silently expose data at runtime.
// ─────────────────────────────────────────────────────────────

const REQUIRED = [
  "JWT_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "FRONTEND_URL",
  "EMAIL_USER",
  "EMAIL_PASS",
];

// Only required when OAuth is being used
const OAUTH_REQUIRED = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_CALLBACK_URL"],
};

export function validateEnv() {
  const missing = [];

  for (const key of REQUIRED) {
    if (!process.env[key] || process.env[key].trim() === "") {
      missing.push(key);
    }
  }

  // Check JWT_SECRET strength
  const jwt = process.env.JWT_SECRET || "";
  if (jwt.length < 64) {
    throw new Error(
      `JWT_SECRET is too short (${jwt.length} chars). Must be at least 64 characters. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }

  // Check for placeholder / default values
  const DANGEROUS_VALUES = ["changeme", "secret", "password", "1234", "test"];
  for (const [key, val] of Object.entries(process.env)) {
    if (REQUIRED.includes(key)) {
      const lower = (val || "").toLowerCase();
      if (DANGEROUS_VALUES.some((d) => lower.includes(d))) {
        console.warn(`⚠️  WARNING: ${key} looks like a placeholder value. Replace it before production.`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `\n❌ Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
      `\n  Add these to your .env file (development) or Vercel / Render dashboard (production).\n` +
      `  NEVER commit .env to git.\n`
    );
  }

  console.log("✅ Environment variables validated");
}