// src/backend/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import passport from "passport";

import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import passwordRoutes from "./routes/password.js";
import oauthRoutes from "./routes/oauth.js";
import greenhouseApplyRoutes from "./routes/greenhouse-apply.js";

dotenv.config();

const app = express();

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

app.use(
  cors({
    origin: [
      "https://pathalytics.vercel.app",
      "http://localhost:5173", // local dev
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(passport.initialize());

// ── Routes ──────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() })
);

app.use("/api/auth", authRoutes);
app.use("/api/auth", meRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/auth", passwordRoutes);
app.use("/api/greenhouse", greenhouseApplyRoutes);

// ── Global Error Handler ─────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app; // keep export too if needed elsewhere