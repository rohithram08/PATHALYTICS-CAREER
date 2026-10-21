// src/backend/middleware/security.js
// ─────────────────────────────────────────────────────────────
// Route-level security utilities actually used by the app.
//
// This file used to describe itself as a 7-layer "centralised security
// stack" with a single applySecurityMiddleware(app) composer — but only
// 3 of those ~10 exports were ever imported anywhere; the rest (Helmet,
// CORS, a global rate limiter, otpLimiter, CSRF, a manual request-size
// cap, an audit logger) were fully dead code, never mounted. That gap
// between what this file claimed to provide and what was actually
// protecting the app in production was itself a risk — exactly the
// kind of place a future read (human or Claude) would trust at face
// value. Trimmed in the P0.3 pass (2026-08-13) to only what's genuinely
// wired into a route:
//
//  - sanitiseInput            — mounted globally in server.js
//  - authLimiter              — POST /user/change-password, DELETE /user/account
//  - uploadLimiter            — the multipart upload routes
//  - requireWhitelistedOrigin — new in this pass, see below
//
// Helmet, CORS, and global rate limiting are live in server.js's own
// inline config, not here — that's the real, active stack.
//
// If you're looking for CSRF protection: it doesn't exist, on purpose.
// The JSON-based API surface doesn't need it — a strict CORS origin
// whitelist plus express.json() only parsing application/json means a
// forged cross-origin JSON request never gets past the browser's CORS
// preflight in the first place. The one place that structural
// protection doesn't reach is multipart/form-data uploads, which are
// CORS-"simple" and skip preflight entirely — that gets
// requireWhitelistedOrigin below instead of a full CSRF token scheme,
// which would need carve-outs for Bearer-only clients that don't exist
// in this codebase yet.
// ─────────────────────────────────────────────────────────────

import rateLimit from "express-rate-limit";
import xss from "xss";

// ── Rate limiters ────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many auth attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Upload limit reached. Try again in an hour." },
});

// ── Input sanitisation ───────────────────────────────────────
// NOTE: this used to also block requests whose body/query contained
// words like SELECT/FROM/WHERE or a semicolon, as a SQL-injection
// guard. That check has been removed — it wasn't providing real
// protection (every db.query() call in this codebase already uses
// parameterized `?` placeholders, which is what actually prevents
// SQL injection) and it WAS breaking completely ordinary input: a
// job description saying "requirements FROM the team", a bio saying
// "WHERE I gained experience", or any comma/semicolon-separated
// skills list would all have been rejected with a 400. A keyword
// blocklist on free text is the wrong tool here; parameterized
// queries are the real defense and are already in place everywhere.
//
// What's kept: HTML/script stripping via the `xss` library, which
// doesn't have that false-positive problem and is worth doing on any
// field that might later be rendered as HTML.
function sanitiseValue(val) {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  return xss(trimmed, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });
}

function deepSanitise(obj) {
  if (typeof obj === "string") return sanitiseValue(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitise);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = deepSanitise(v);
    }
    return clean;
  }
  return obj;
}

export function sanitiseInput(req, res, next) {
  req.body = deepSanitise(req.body);

  // Express 5 exposes req.query as a getter-only accessor — assigning
  // `req.query = ...` throws "Cannot set property query of
  // #<IncomingMessage> which has only a getter" on every single request.
  // Mutate the existing object's keys in place instead of replacing the
  // reference.
  const cleanedQuery = deepSanitise(req.query);
  for (const key of Object.keys(req.query)) delete req.query[key];
  Object.assign(req.query, cleanedQuery);

  next();
}

// ── Origin allowlist for CORS-"simple" routes ────────────────
// multipart/form-data requests never trigger a CORS preflight, so the
// browser never gets a chance to block a cross-origin submission the
// way it does for the rest of the API. This mirrors server.js's CORS
// origin whitelist (same env vars, same Vercel-preview pattern) rather
// than importing it, since touching server.js/CORS was out of scope
// for this pass — worth consolidating into one shared source of truth
// if server.js ever gets touched for other reasons.
const UPLOAD_PROD_ORIGIN    = process.env.FRONTEND_URL || "https://pathalytics.vercel.app";
const UPLOAD_VERCEL_PATTERN = /^https:\/\/pathalytics(-[a-z0-9-]+)?\.vercel\.app$/;
const UPLOAD_EXTRA_ORIGINS  = (process.env.EXTRA_ORIGINS || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

export function requireWhitelistedOrigin(req, res, next) {
  const origin = req.headers.origin;

  // No Origin header at all means this isn't a cross-site browser
  // request (curl, server-to-server, some same-origin cases) — the
  // same carve-out server.js's CORS check makes. Safe here for the
  // same reason it's safe there: a real cross-site browser request
  // always carries this header — the browser sets it, a page can't
  // omit or forge it.
  if (!origin) return next();

  const allowed =
    origin === UPLOAD_PROD_ORIGIN ||
    UPLOAD_VERCEL_PATTERN.test(origin) ||
    UPLOAD_EXTRA_ORIGINS.includes(origin) ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080" ||
    origin === "http://localhost:3000";

  if (!allowed) {
    return res.status(403).json({ message: "Origin not allowed" });
  }
  next();
}
