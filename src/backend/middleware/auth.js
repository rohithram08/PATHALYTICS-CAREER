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
    const [rows] = await db.query(
      "SELECT verification_status FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Recruiter profile not found. Please complete your profile first." });
    }

    const { verification_status } = rows[0];

    if (verification_status !== "approved") {
      return res.status(403).json({
        message:
          verification_status === "rejected"
            ? "Your recruiter account verification was rejected. Please re-upload a valid document."
            : "Your recruiter account is pending verification. This action will be available once approved.",
        verificationStatus: verification_status,
      });
    }

    next();
  } catch (err) {
    console.error("[requireVerifiedRecruiter]", err);
    return res.status(500).json({ message: "Server error" });
  }
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