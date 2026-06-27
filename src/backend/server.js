// ============================================================
// src/backend/server.js  —  SECURE VERSION
// Pathalytics Backend — API-first architecture
// All secrets from environment variables ONLY. No hardcoding.
// ============================================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";
import rateLimit from "express-rate-limit";
import { validateEnv } from "./utils/validateEnv.js";

// ── Validate all required env vars on startup ────────────────
validateEnv();

import authRoutes           from "./routes/auth.js";
import meRoutes             from "./routes/me.js";
import passwordRoutes       from "./routes/password.js";
import oauthRoutes          from "./routes/oauth.js";
import jobsRoutes           from "./routes/jobs.js";
import chatbotRoutes        from "./routes/chatbot.js";
import greenhouseApplyRoutes from "./routes/greenhouse-apply.js";
import recruiterRoutes      from "./routes/recruiter.js";
import applicationsRoutes   from "./routes/applications.js";
import adminRoutes          from "./routes/admin.js";

const app = express();

// ── 1. Security Headers (Helmet) ────────────────────────────
// Helmet sets 14+ HTTP security headers automatically
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],   // needed for Tailwind inline styles
        imgSrc:         ["'self'", "data:", "https:"],
        connectSrc:     ["'self'", process.env.FRONTEND_URL],
        fontSrc:        ["'self'", "https://fonts.gstatic.com"],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],                       // blocks clickjacking
        upgradeInsecureRequests: [],
      },
    },
    crossOriginOpenerPolicy:   { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy:            { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,       // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff:        true,     // X-Content-Type-Options
    xssFilter:      true,     // X-XSS-Protection (legacy fallback)
    hidePoweredBy:  true,     // Remove X-Powered-By: Express
  })
);

// ── 2. CORS ─────────────────────────────────────────────────
// Allows:
//   • Exact production URL (from FRONTEND_URL env var)
//   • Any Vercel preview URL for this project — covers every branch
//     deployment without any manual config (pathalytics-*.vercel.app)
//   • EXTRA_ORIGINS env var — comma-separated, for custom domains / staging
//   • localhost for local development
const PROD_ORIGIN    = process.env.FRONTEND_URL || "https://pathalytics.vercel.app";
const VERCEL_PATTERN = /^https:\/\/pathalytics(-[a-z0-9-]+)?\.vercel\.app$/;
const EXTRA_ORIGINS  = (process.env.EXTRA_ORIGINS || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      // Allow server-to-server requests (no Origin header)
      if (!incomingOrigin) return callback(null, true);

      const allowed =
        incomingOrigin === PROD_ORIGIN               ||
        VERCEL_PATTERN.test(incomingOrigin)          ||
        EXTRA_ORIGINS.includes(incomingOrigin)       ||
        incomingOrigin === "http://localhost:5173"    ||
        incomingOrigin === "http://localhost:3000";

      if (allowed) {
        callback(null, true);
      } else {
        console.warn("[CORS] Blocked origin:", incomingOrigin);
        callback(new Error(`CORS blocked: ${incomingOrigin}`));
      }
    },
    credentials: true,                         // allow httpOnly cookies
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400,                             // cache preflight for 24h
  })
);

// ── 3. Body limits — prevent DoS via huge payloads ──────────
// Note: file uploads (multer routes) bypass express.json entirely,
// so 50kb here only governs JSON request bodies — correct.
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(cookieParser());

// ── 4. Request logging (production: no sensitive data) ──────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      skip: (req) => req.url === "/api/health",
    })
  );
}

// ── 5. Global rate limiter (all routes) ─────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 200,                    // max 200 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: (req) => req.url === "/api/health",
});
app.use(globalLimiter);

// ── 6. Passport (OAuth only — no sessions) ──────────────────
app.use(passport.initialize());

// ── 7. Request ID for tracing ───────────────────────────────
app.use((req, _res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  next();
});

// ── 8. Health check (public, no auth needed) ────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) })
);

// ── 9. API Routes ────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/auth",        meRoutes);
app.use("/api/auth",        oauthRoutes);
app.use("/api/auth",        passwordRoutes);
app.use("/api/jobs",        jobsRoutes);
app.use("/api/chatbot",     chatbotRoutes);
app.use("/api/greenhouse",  greenhouseApplyRoutes);
app.use("/api/recruiter",   recruiterRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin",        adminRoutes);

// ── 10. 404 handler for unknown routes ──────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── 11. Global error handler ─────────────────────────────────
// NEVER send stack traces to clients in production
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  console.error(`[ERROR] ${req.requestId || ""} ${err.message}`, {
    status,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(status).json({
    message: isProd
      ? status < 500 ? err.message : "An error occurred"
      : err.message,
    requestId: req.requestId,
  });
});

// ── 12. Start server ─────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, () => {
  console.log(`✅ Pathalytics API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Allowed CORS: ${PROD_ORIGIN} + Vercel previews`);
});

export default app;