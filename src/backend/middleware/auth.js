// src/backend/middleware/auth.js
// ─────────────────────────────────────────────────────────────
// Unified authentication middleware.
// Reads JWT from httpOnly cookie (preferred) OR Authorization
// header (Bearer token) for backwards compat with mobile apps.
//
// WHY httpOnly cookie instead of localStorage?
//   localStorage is accessible by ANY JavaScript on the page.
//   If your site ever gets an XSS attack (injected script),
//   the attacker can steal the token from localStorage.
//   httpOnly cookies CANNOT be read by JavaScript at all —
//   only the browser sends them automatically with each request.
// ─────────────────────────────────────────────────────────────

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract JWT from request.
 * Priority: httpOnly cookie > Authorization Bearer header
 */
function extractToken(req) {
  // 1. httpOnly cookie (most secure)
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  // 2. Authorization: Bearer <token>  (for API clients / mobile)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * requireAuth — protects any route that needs a logged-in user.
 * Sets req.user = { id, email, role } on success.
 */
export const requireAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],          // explicitly allow only HS256
      clockTolerance: 30,             // 30s clock skew tolerance
    });

    // Attach minimal user info — never attach the full DB row
    req.user = {
      id:    payload.id,
      email: payload.email,
      role:  payload.role || "user",
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
};

/**
 * requireRole(...roles) — after requireAuth, checks user's role.
 * Example: router.get("/admin", requireAuth, requireRole("admin"), handler)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to access this resource" });
  }
  next();
};

/**
 * optionalAuth — attaches user if token is present, but doesn't
 * block the request if there's no token.  Use for public routes
 * that show different content to authenticated users.
 */
export const optionalAuth = (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      // Invalid token on optional route → ignore, continue as guest
      req.user = null;
    }
  }
  next();
};