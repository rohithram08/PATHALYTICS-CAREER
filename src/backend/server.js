// src/backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";
import meRoutes from "./routes/me.js";

import authRoutes from "./routes/auth.js";
import changePasswordRoutes from "./routes/changepassword.js";
import oauthRoutes from "./routes/oauth.js";
import greenhouseApplyRoutes from "./routes/greenhouse-apply.js";

dotenv.config();

const app = express();

// ============ Security & Middleware ============
app.use(
  helmet({
    // Allow OAuth redirects to external providers
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

app.use(
  cors({
    origin: ["https://pathalytics.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ============ Passport (JWT-based, no session) ============
app.use(passport.initialize());

// ============ Routes ============
app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

app.use("/api/auth", authRoutes);
app.use("/api/auth", meRoutes); // Email/password auth
app.use("/api/auth", oauthRoutes); // Google + GitHub OAuth
app.use("/api", changePasswordRoutes);
app.use("/api/greenhouse", greenhouseApplyRoutes); // Real Easy Apply (Greenhouse proxy)

// ============ Global Error Handler ============
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

// ============ Start Server ============
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

// Graceful shutdown
["SIGTERM", "SIGINT"].forEach((sig) =>
  process.on(sig, () => server.close(() => process.exit(0)))
);