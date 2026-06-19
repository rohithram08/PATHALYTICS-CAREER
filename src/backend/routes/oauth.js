// src/backend/routes/oauth.js
import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

const router = express.Router();

// ============ SMART USER UPSERT WITH LINKING ============
const findOrLinkOrCreate = async (profile, provider) => {
  const email = profile.emails?.[0]?.value?.toLowerCase().trim();
  const name = profile.displayName || profile.username || "User";
  const providerId = profile.id;
  const avatarUrl = profile.photos?.[0]?.value || null;

  if (!email) {
    throw new Error(
      `No email provided by ${provider}. Please make your email public or use email signup.`
    );
  }

  // STEP 1: Check if this exact (provider, providerId) is already linked
  const [providerRows] = await db.query(
    `SELECT u.* FROM user_providers up
     JOIN users u ON u.id = up.user_id
     WHERE up.provider = ? AND up.provider_user_id= ?`,
    [provider, providerId]
  );

  if (providerRows.length > 0) {
    // Already linked → just log them in
    return { user: providerRows[0], linked: false, created: false };
  }

  // STEP 2: Check if a user with this email already exists
  const [emailRows] = await db.query(
    "SELECT * FROM users WHERE LOWER(email) = ?",
    [email]
  );

  if (emailRows.length > 0) {
    const existingUser = emailRows[0];

    // 🔗 LINK this OAuth provider to the existing account
    await db.query(
      `INSERT INTO user_providers (user_id, provider, provider_id, provider_email)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id)`,
      [existingUser.id, provider, providerId, email]
    );

    // Update avatar if not set
    if (!existingUser.avatar_url && avatarUrl) {
      await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [
        avatarUrl,
        existingUser.id,
      ]);
      existingUser.avatar_url = avatarUrl;
    }

    // Mark email as verified (OAuth providers verify emails)
    await db.query(
      "UPDATE users SET email_verified = 1 WHERE id = ?",
      [existingUser.id]
    );

    return { user: existingUser, linked: true, created: false };
  }

  // STEP 3: No existing user → create new account
  const [insertResult] = await db.query(
    `INSERT INTO users (name, email, password, avatar_url, email_verified)
     VALUES (?, ?, '', ?, 1)`,
    [name, email, avatarUrl]
  );

  const newUserId = insertResult.insertId;

  // Link the provider
  await db.query(
    `INSERT INTO user_providers (user_id, provider, provider_id, provider_email)
     VALUES (?, ?, ?, ?)`,
    [newUserId, provider, providerId, email]
  );

  const [newUser] = await db.query("SELECT * FROM users WHERE id = ?", [newUserId]);
  return { user: newUser[0], linked: false, created: true };
};

// ============ Generate JWT redirect URL ============
const generateAuthRedirect = (user, info = {}) => {
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const params = new URLSearchParams({
    token,
    name: user.name || "User",
    email: user.email,
  });

  if (info.linked) params.set("linked", "1");
  if (info.created) params.set("created", "1");

  return `${process.env.FRONTEND_URL}/oauth-success?${params.toString()}`;
};

// ============ Google Strategy ============
const GOOGLE_ENABLED =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

if (GOOGLE_ENABLED) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:5000/api/auth/google/callback",
      },
      async (_at, _rt, profile, done) => {
        try {
          const result = await findOrLinkOrCreate(profile, "google");
          return done(null, { ...result.user, _info: result });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log("✅ Google OAuth enabled");
} else {
  console.warn("⚠️  Google OAuth disabled — credentials missing");
}

// ============ GitHub Strategy ============
const GITHUB_ENABLED =
  !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

if (GITHUB_ENABLED) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          "http://localhost:5000/api/auth/github/callback",
        scope: ["user:email"],
      },
      async (_at, _rt, profile, done) => {
        try {
          const result = await findOrLinkOrCreate(profile, "github");
          return done(null, { ...result.user, _info: result });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log("✅ GitHub OAuth enabled");
} else {
  console.warn("⚠️  GitHub OAuth disabled — credentials missing");
}

// ============ ROUTES ============

// Google
router.get("/google", (req, res, next) => {
  if (!GOOGLE_ENABLED) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=google_not_configured`
    );
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!GOOGLE_ENABLED) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_not_configured`
      );
    }
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    try {
      const { _info, ...user } = req.user;
      res.redirect(generateAuthRedirect(user, _info));
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_failed`);
    }
  }
);

// GitHub
router.get("/github", (req, res, next) => {
  if (!GITHUB_ENABLED) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=github_not_configured`
    );
  }
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })(req, res, next);
});

router.get(
  "/github/callback",
  (req, res, next) => {
    if (!GITHUB_ENABLED) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=github_not_configured`
      );
    }
    passport.authenticate("github", {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    try {
      const { _info, ...user } = req.user;
      res.redirect(generateAuthRedirect(user, _info));
    } catch (err) {
      console.error("GitHub callback error:", err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_failed`);
    }
  }
);

export default router;