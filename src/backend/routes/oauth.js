// src/backend/routes/oauth.js
// ─────────────────────────────────────────────────────────────
// OAuth 2.0 flows: Google + GitHub
//
// KEY SECURITY FIX vs. old version:
//   OLD: redirect to /oauth-success?token=JWT  ← JWT in URL!
//        → logged in server access logs
//        → in browser history  
//        → sent in Referer headers to 3rd parties
//        → visible to analytics scripts
//
//   NEW: set JWT in httpOnly cookie, redirect to /oauth-success
//        with NO token in the URL. The frontend reads the user
//        from /api/auth/me (using the cookie automatically).
//
// Also added: CSRF state parameter to prevent OAuth CSRF attacks.
// ─────────────────────────────────────────────────────────────

import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../db.js";
import { authCookieOptions } from "../middleware/auth.js";

const router = express.Router();

// ── In-memory CSRF state store ────────────────────────────────
// In production with multiple server instances, use Redis instead
const oauthStates = new Map();   // state → { createdAt, provider }

// ── One-time OAuth exchange codes ─────────────────────────────
// The callback redirect can't rely on a cross-site cookie surviving
// the trip back to the frontend's own fetch() calls: modern browsers
// increasingly block third-party cookies — a cookie set by this
// domain, read on a cross-site fetch() initiated from
// pathalytics.vercel.app — regardless of SameSite=None. That's a
// separate, newer restriction layer on top of SameSite, and no
// cookie-attribute tuning gets around it.
//
// Instead of putting the JWT itself in the redirect URL (the original
// security problem this cookie approach was trying to fix — a
// long-lived token in browser history/referrers/server logs), we
// redirect with a short-lived, single-use, random opaque code. The
// frontend immediately POSTs it back and gets the real JWT in a JSON
// response body — not a cookie, so third-party cookie blocking never
// enters into it — then uses that token exactly like an email/password
// login from that point on. The code is useless after ~2 minutes or
// after one use, so it keeps the same "nothing sensitive sits in the
// URL for long" property the cookie approach was going for.
const oauthExchangeCodes = new Map();  // code → { token, createdAt }
const EXCHANGE_CODE_TTL_MS = 2 * 60 * 1000;

function generateExchangeCode() {
  return crypto.randomBytes(32).toString("hex");
}

function generateState() {
  return crypto.randomBytes(32).toString("hex");
}

function validateState(state) {
  if (!state || !oauthStates.has(state)) return false;
  const { createdAt } = oauthStates.get(state);
  oauthStates.delete(state);    // single-use

  // State expires after 10 minutes
  return Date.now() - createdAt < 10 * 60 * 1000;
}

// Clean up old states every 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, val] of oauthStates.entries()) {
    if (val.createdAt < cutoff) oauthStates.delete(key);
  }
}, 15 * 60 * 1000);

// Clean up expired exchange codes every minute (short TTL, so check more often)
setInterval(() => {
  const cutoff = Date.now() - EXCHANGE_CODE_TTL_MS;
  for (const [key, val] of oauthExchangeCodes.entries()) {
    if (val.createdAt < cutoff) oauthExchangeCodes.delete(key);
  }
}, 60 * 1000);

// ── JWT cookie helper ─────────────────────────────────────────
function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d", algorithm: "HS256" }
  );

  // See middleware/auth.js authCookieOptions() for the full reasoning —
  // shared now instead of keeping its own copy of this logic.
  res.cookie("token", token, authCookieOptions(7 * 24 * 60 * 60 * 1000)); // 7 days

  return token;  // returned so we can also send it in JSON for mobile clients
}

// ── User upsert logic ─────────────────────────────────────────
async function findOrCreateUser(profile, provider) {
  const email = profile.emails?.[0]?.value?.toLowerCase().trim();
  const name  = profile.displayName || profile.username || "User";
  const providerUserId = profile.id;
  const avatarUrl = profile.photos?.[0]?.value || null;

  if (!email) {
    throw new Error(
      `${provider} did not provide an email address. ` +
      `Please make your email public on ${provider} or use email/password signup.`
    );
  }

  // 1. Provider already linked?
  const [providerRows] = await db.query(
    `SELECT u.* FROM user_providers up
     JOIN users u ON u.id = up.user_id
     WHERE up.provider = ? AND up.provider_user_id = ?`,
    [provider, providerUserId]
  );
  if (providerRows.length > 0) {
    return { user: providerRows[0], action: "login" };
  }

  // 2. Email already registered? Link provider.
  const [emailRows] = await db.query(
    "SELECT * FROM users WHERE LOWER(email) = ?",
    [email]
  );
  if (emailRows.length > 0) {
    const existing = emailRows[0];
    await db.query(
      `INSERT INTO user_providers (user_id, provider, provider_user_id, provider_email)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE provider_user_id = VALUES(provider_user_id)`,
      [existing.id, provider, providerUserId, email]
    );
    if (!existing.avatar_url && avatarUrl) {
      await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, existing.id]);
    }
    await db.query("UPDATE users SET email_verified = 1 WHERE id = ?", [existing.id]);
    return { user: existing, action: "linked" };
  }

  // 3. New user — create account
  const [result] = await db.query(
    "INSERT INTO users (name, email, password, avatar_url, email_verified, role) VALUES (?, ?, '', ?, 1, 'user')",
    [name, email, avatarUrl]
  );
  await db.query(
    "INSERT INTO user_providers (user_id, provider, provider_user_id, provider_email) VALUES (?, ?, ?, ?)",
    [result.insertId, provider, providerUserId, email]
  );
  const [newUser] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
  return { user: newUser[0], action: "created" };
}

// ── Register Passport strategies ─────────────────────────────
const GOOGLE_ENABLED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const GITHUB_ENABLED = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

if (GOOGLE_ENABLED) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (_at, _rt, profile, done) => {
      try {
        const result = await findOrCreateUser(profile, "google");
        done(null, result);
      } catch (err) {
        done(err);
      }
    }
  ));
}

if (GITHUB_ENABLED) {
  passport.use(new GitHubStrategy(
    {
      clientID:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:  process.env.GITHUB_CALLBACK_URL,
      scope:        ["user:email"],
    },
    async (_at, _rt, profile, done) => {
      try {
        const result = await findOrCreateUser(profile, "github");
        done(null, result);
      } catch (err) {
        done(err);
      }
    }
  ));
}

// ── Route: Initiate Google OAuth ──────────────────────────────
router.get("/google", (req, res, next) => {
  if (!GOOGLE_ENABLED) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured`);
  }
  // Generate CSRF state token
  const state = generateState();
  oauthStates.set(state, { createdAt: Date.now(), provider: "google" });

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state,                 // ← CSRF protection
  })(req, res, next);
});

// ── Route: Google callback ────────────────────────────────────
router.get(
  "/google/callback",
  (req, res, next) => {
    // Validate CSRF state
    if (!validateState(req.query.state)) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    const { user, action } = req.user;
    const token = setAuthCookie(res, user);

    const code = generateExchangeCode();
    oauthExchangeCodes.set(code, { token, createdAt: Date.now() });

    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?action=${action}&code=${code}`);
  }
);

// ── Route: Initiate GitHub OAuth ──────────────────────────────
router.get("/github", (req, res, next) => {
  if (!GITHUB_ENABLED) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=github_not_configured`);
  }
  const state = generateState();
  oauthStates.set(state, { createdAt: Date.now(), provider: "github" });

  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
    state,
  })(req, res, next);
});

// ── Route: GitHub callback ────────────────────────────────────
router.get(
  "/github/callback",
  (req, res, next) => {
    if (!validateState(req.query.state)) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }
    passport.authenticate("github", {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    const { user, action } = req.user;
    const token = setAuthCookie(res, user);

    const code = generateExchangeCode();
    oauthExchangeCodes.set(code, { token, createdAt: Date.now() });

    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?action=${action}&code=${code}`);
  }
);

// ── Route: exchange a one-time OAuth code for the real JWT ────
// Called immediately by OAuthSuccess.tsx. Returns the token in the
// response body (like a normal login) rather than depending on the
// cookie set during the callback — see the comment on
// oauthExchangeCodes above for why.
router.post("/oauth/exchange", (req, res) => {
  const { code } = req.body || {};

  if (!code || typeof code !== "string" || !oauthExchangeCodes.has(code)) {
    return res.status(400).json({ message: "Invalid or expired sign-in code. Please try signing in again." });
  }

  const entry = oauthExchangeCodes.get(code);
  oauthExchangeCodes.delete(code);   // single-use, regardless of outcome below

  if (Date.now() - entry.createdAt > EXCHANGE_CODE_TTL_MS) {
    return res.status(400).json({ message: "Sign-in code expired. Please try signing in again." });
  }

  res.json({ token: entry.token });
});

export default router;