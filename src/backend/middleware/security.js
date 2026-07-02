// src/backend/middleware/security.js
// ─────────────────────────────────────────────────────────────
// Centralised security middleware stack
//
// Layers:
//  1. Helmet – HTTP security headers (CSP, HSTS, X-Frame-Options…)
//  2. CORS  – whitelist origins, allow credentials
//  3. Rate limiting – global + per-route
//  4. Input sanitisation – trim strings, strip HTML, block SQLi patterns
//  5. CSRF token – double-submit cookie for state-changing routes
//  6. Request-size cap – prevent payload-based DoS
//  7. Audit logger – security-relevant events to console (replace with real logger in prod)
// ─────────────────────────────────────────────────────────────

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import xss from "xss";
import crypto from "crypto";

// ── 1. Helmet ─────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.groq.com", "https://api.adzuna.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginEmbedderPolicy: false, // allow Google OAuth iframe
});

// ── 2. CORS ───────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

export const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow server-to-server / curl / Postman (no origin header)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: ["X-RateLimit-Remaining"],
  maxAge: 86400,
});

// ── 3. Rate limiters ──────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  message: { message: "Too many requests. Please slow down." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many auth attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Try again later." },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Upload limit reached. Try again in an hour." },
});

// ── 4. Input sanitisation ─────────────────────────────────────
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

// ── 5. CSRF ───────────────────────────────────────────────────
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    auditLog("CSRF_REJECTED", req);
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
}

export function setCSRFToken(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // JS must read it to put in header
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}

// ── 6. Request-size cap (express.json handles this but we enforce here too) ─
export function requestSizeCap(req, res, next) {
  const contentLength = parseInt(req.headers["content-length"] || "0");
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (contentLength > MAX_BYTES) {
    return res.status(413).json({ message: "Request body too large" });
  }
  next();
}

// ── 7. Audit logger ───────────────────────────────────────────
export function auditLog(event, req, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ip: req?.ip || "unknown",
    method: req?.method,
    path: req?.path,
    userId: req?.user?.id,
    ...extra,
  };
  // In production, pipe this to your structured log sink (Datadog, Sentry, etc.)
  console.warn("[SECURITY]", JSON.stringify(entry));
}

// ── Compose: apply all in one call ────────────────────────────
export function applySecurityMiddleware(app) {
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(requestSizeCap);
  app.use(sanitiseInput);
  app.use(setCSRFToken);
}