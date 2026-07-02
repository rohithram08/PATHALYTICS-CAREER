// ============================================================
// src/backend/server.js  —  SECURE VERSION
// Pathalytics Backend — API-first architecture
// All secrets from environment variables ONLY. No hardcoding.
//
// CHANGES FROM YOUR ORIGINAL:
//   1. Removed the duplicate app.use(express.json()) and
//      app.use(express.urlencoded()) that appeared again just
//      before the route mounts (step 9). Body parsers are
//      already registered at step 3 — double-registering them
//      wastes memory and can cause subtle body-parse bugs.
//   That's it. Everything else is exactly as you wrote it.
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

import authRoutes            from "./routes/auth.js";
import meRoutes              from "./routes/me.js";
import passwordRoutes        from "./routes/password.js";
import oauthRoutes           from "./routes/oauth.js";
import jobsRoutes            from "./routes/jobs.js";
import chatbotRoutes         from "./routes/chatbot.js";
import greenhouseApplyRoutes from "./routes/greenhouse-apply.js";
import recruiterRoutes       from "./routes/recruiter.js";
import applicationsRoutes    from "./routes/applications.js";
import adminRoutes           from "./routes/admin.js";
import { sanitiseInput } from "./middleware/security.js";

const app = express();

// ── 1. Security Headers (Helmet) ────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", "data:", "https:"],
        connectSrc:     ["'self'", process.env.FRONTEND_URL],
        fontSrc:        ["'self'", "https://fonts.gstatic.com"],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginOpenerPolicy:   { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy:            { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff:       true,
    xssFilter:     true,
    hidePoweredBy: true,
  })
);

// ── 2. CORS ─────────────────────────────────────────────────
const PROD_ORIGIN    = process.env.FRONTEND_URL || "https://pathalytics.vercel.app";
const VERCEL_PATTERN = /^https:\/\/pathalytics(-[a-z0-9-]+)?\.vercel\.app$/;
const EXTRA_ORIGINS  = (process.env.EXTRA_ORIGINS || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      if (!incomingOrigin) return callback(null, true);

      const allowed =
        incomingOrigin === PROD_ORIGIN            ||
        VERCEL_PATTERN.test(incomingOrigin)       ||
        EXTRA_ORIGINS.includes(incomingOrigin)    ||
        incomingOrigin === "http://localhost:5173" ||
        incomingOrigin === "http://localhost:3000";

      if (allowed) {
        callback(null, true);
      } else {
        console.warn("[CORS] Blocked origin:", incomingOrigin);
        callback(new Error(`CORS blocked: ${incomingOrigin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400,
  })
);

// ── 3. Body limits ───────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(cookieParser());

// ── 3b. Input sanitisation ───────────────────────────────────
// Was defined in middleware/security.js but never actually applied
// anywhere in the request pipeline — dead code until now.
app.use(sanitiseInput);

// ── 4. Request logging ───────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      skip: (req) => req.url === "/api/health",
    })
  );
}

// ── 5. Global rate limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: (req) => req.url === "/api/health",
});
app.use(globalLimiter);

// ── 6. Passport (OAuth only — no sessions) ───────────────────
app.use(passport.initialize());

// ── 7. Request ID for tracing ────────────────────────────────
app.use((req, _res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  next();
});

// ── 8. Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) })
);

// ── 9. API Routes ────────────────────────────────────────────
// NOTE: express.json() / urlencoded() are NOT repeated here —
// they are already registered at step 3 above.
app.use("/api/auth",         authRoutes);
app.use("/api/user",         meRoutes);         // GET /api/user/me ← fixes 404
app.use("/api/auth",         meRoutes);         // GET /api/auth/me ← AuthContext.tsx and src/lib/api.ts both call this path; same router, same behaviour, just also reachable here.
app.use("/api/auth",         oauthRoutes);
app.use("/api/auth",         passwordRoutes);
app.use("/api/jobs",         jobsRoutes);
app.use("/api/chatbot",      chatbotRoutes);
app.use("/api/chat",         chatbotRoutes);    // Chatbot.tsx / ChatAssistant.tsx call /api/chat (no "bot") — same router, dual-mounted rather than editing two frontend files.
app.use("/api/greenhouse",   greenhouseApplyRoutes);
app.use("/api/recruiter",    recruiterRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin",        adminRoutes);

// ── 10. 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── 11. Global error handler ─────────────────────────────────
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

// ── 12. Export app — start.js is responsible for calling listen() ──
// (Previously this file ALSO called app.listen() here, in addition to
// start.js calling it again after importing this module — two servers
// both trying to bind the same PORT. The second .listen() call throws
// EADDRINUSE, and an unhandled 'error' event on a net.Server crashes
// the process by default. One listener, in one place, now.)
if (process.env.NODE_ENV !== "test") {
  console.log(`✅ Pathalytics API ready (port ${process.env.PORT || 5000} — bound by start.js)`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Allowed CORS: ${PROD_ORIGIN} + Vercel previews`);
}

export default app;