// src/backend/middleware/auth.js
// ─────────────────────────────────────────────────────────────
// JWT authentication + RBAC middleware
//
//  requireAuth(req, res, next)         — any authenticated user
//  requireRole("recruiter")            — role guard factory
//  requireOwnerOrRole(field, role)     — user owns resource OR has role
//
// Token sources (checked in order):
//   1. httpOnly cookie  "token"
//   2. Authorization: Bearer <token> header (for mobile API clients)
// ─────────────────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_COOKIE = "token";

// ── Shared cookie options (used by every place that sets/clears the
// auth cookie: routes/auth.js login+logout, routes/oauth.js, routes/me.js
// delete-account) ────────────────────────────────────────────────
// Previously each of those four spots had its own copy of this exact
// logic, duplicated. That's how a bug like this stays hidden: if one
// copy doesn't get a fix the others got, whatever flow uses that one
// copy just quietly breaks, and "wrong cookie flags" produces a 401
// that looks identical to a dozen unrelated causes.
//
// isProd deliberately does NOT use a bare `=== "production"` — trim()
// + toLowerCase() guard against a stray trailing space or different
// casing in however NODE_ENV ended up set on the hosting platform,
// which would otherwise silently select the dev-mode cookie settings
// (secure:false, sameSite:"lax") in what is actually a real cross-site
// production deployment. The cookie still gets SET fine in that case —
// Set-Cookie isn't blocked by SameSite — it just never gets SENT back
// on the next cross-site request, which is exactly the failure mode
// this whole cookie rework exists to prevent.
export function isProdEnv() {
  return (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
}

export function authCookieOptions(maxAgeMs) {
  const isProd = isProdEnv();
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
  if (maxAgeMs !== undefined) opts.maxAge = maxAgeMs;
  return opts;
}

// ── Token extraction ──────────────────────────────────────────
function extractToken(req) {
  // Prefer httpOnly cookie (secure path)
  if (req.cookies?.[TOKEN_COOKIE]) return req.cookies[TOKEN_COOKIE];

  // Fallback: Authorization header (mobile/API clients)
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  return null;
}

// ── Core auth guard ───────────────────────────────────────────
export async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

    // Verify user still exists and is not locked/deleted
    const [rows] = await db.query(
      "SELECT id, name, email, role, locked_until FROM users WHERE id = ?",
      [payload.id]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Account not found" });
    }

    const user = rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ message: "Account is temporarily locked" });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid authentication token" });
    }
    console.error("[requireAuth]", err);
    return res.status(500).json({ message: "Authentication error" });
  }
}

// ── Role guard factory ────────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
}

// Convenience aliases
export const requireRecruiter = requireRole("recruiter", "admin");
export const requireAdmin = requireRole("admin");

// ── Verified-recruiter check (shared logic) ────────────────────
// Returns null if the recruiter (identified by userId) is clear to
// proceed, or the verification_status string ('pending'|'rejected')
// if not. Returns undefined if they have no recruiter_profiles row
// at all yet.
async function getRecruiterVerificationStatus(userId) {
  const [rows] = await db.query(
    "SELECT verification_status FROM recruiter_profiles WHERE user_id = ?",
    [userId]
  );
  return rows.length ? rows[0].verification_status : undefined;
}

function verificationBlockResponse(verification_status) {
  if (verification_status === undefined) {
    return { status: 404, body: { message: "Recruiter profile not found. Please complete your profile first." } };
  }
  return {
    status: 403,
    body: {
      message:
        verification_status === "rejected"
          ? "Your recruiter account verification was rejected. Please re-upload a valid document."
          : "Your recruiter account is pending verification. This action will be available once approved.",
      verificationStatus: verification_status,
    },
  };
}

// ── Verified-recruiter guard ──────────────────────────────────
// Must run AFTER requireAuth + requireRole("recruiter"). Blocks
// recruiters whose company hasn't been approved yet (see
// recruiter_profiles.verification_status: pending|approved|rejected)
// from doing anything candidate-facing, e.g. publishing a job.
// Admins bypass this check.
export async function requireVerifiedRecruiter(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role === "admin") return next();

  try {
    const verification_status = await getRecruiterVerificationStatus(req.user.id);
    if (verification_status !== "approved") {
      const blocked = verificationBlockResponse(verification_status);
      return res.status(blocked.status).json(blocked.body);
    }
    next();
  } catch (err) {
    console.error("[requireVerifiedRecruiter]", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// Same check, but callable inline for routes where verification should
// only gate SOME requests — e.g. saving a job as a draft is allowed
// pre-verification (see routes/jobs.js POST /), but the same request
// setting is_active/publish:true is a publish action and isn't. Returns
// null when clear to proceed, or an { status, body } pair to send back
// when blocked. Admins bypass.
export async function checkRecruiterVerified(req) {
  if (req.user.role === "admin") return null;
  const verification_status = await getRecruiterVerificationStatus(req.user.id);
  if (verification_status === "approved") return null;
  return verificationBlockResponse(verification_status);
}

// ── Optional auth (attaches user if token is valid, doesn't block) ──
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [payload.id]
    );
    if (rows.length) req.user = rows[0];
  } catch {
    // Silently ignore invalid token for optional routes
  }
  next();
}

// ── Resource ownership check ─────────────────────────────────
// Usage: requireAuth, requireOwnerOrRole("user_id", "admin")
export function requireOwnerOrRole(resourceUserIdField, ...adminRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isOwner = String(req.params[resourceUserIdField] || req.body[resourceUserIdField]) === String(req.user.id);
    const isPrivileged = adminRoles.includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: "You don't have permission to access this resource" });
    }
    next();
  };
}