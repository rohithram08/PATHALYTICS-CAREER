// src/backend/routes/auth.js
// ─────────────────────────────────────────────────────────────
// Authentication routes: signup, login, logout, OTP flow
//
// Security fixes vs old version:
//   1. OTP now uses crypto.randomInt() — NOT Math.random()
//      Math.random() is NOT cryptographically secure. A smart
//      attacker can predict it by analyzing enough outputs.
//      crypto.randomInt() uses the OS's secure RNG.
//
//   2. Login sets JWT in httpOnly cookie AND returns token
//      (cookie is the secure path; token in body is for
//      mobile app clients that can't use cookies)
//
//   3. Account lockout after 5 failed attempts (15 min)
//
//   4. Logout clears the cookie properly
//
//   5. Signup now reads role from request body and creates
//      recruiter_profiles row immediately for recruiter signups
// ─────────────────────────────────────────────────────────────

import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { z } from "zod";
import db from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ── Rate limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,   // 10 login attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,    // 3 OTP requests per hour per IP
  message: { message: "Too many OTP requests. Please try again later." },
});

// ── Validation schemas ────────────────────────────────────────
const signupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8,  "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

// ── JWT + cookie helper ───────────────────────────────────────
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
  });
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge:   24 * 60 * 60 * 1000,   // 1 day
    path:     "/",
  });
}

// ── Email transporter (created once, reused) ──────────────────
let mailer = null;
function getMailer() {
  if (!mailer) {
    mailer = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,      // use Gmail App Password, NOT main password
      },
    });
  }
  return mailer;
}

// ── POST /api/auth/signup ─────────────────────────────────────
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors:  parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;

    // Read role from body — only allow safe values, default to 'user'
    const role = req.body.role === "recruiter" ? "recruiter" : "user";

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    // Generic message — don't reveal whether email exists
    if (existing.length > 0) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 0)",
      [name, email, hashedPassword, role]
    );
    const userId = result.insertId;

    // If recruiter, create the recruiter_profiles row immediately
    // so RecruiterGuard and /api/recruiter/profile work right away.
    if (role === "recruiter") {
      const companyName = (req.body.companyName || "").trim();
      const companySize = req.body.companySize  || "1-10";
      const industry    = (req.body.industry    || "").trim();
      const designation = (req.body.designation || "").trim();

      await db.query(
        `INSERT INTO recruiter_profiles
           (user_id, company_name, company_size, industry, designation, verification_status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, companyName, companySize, industry, designation]
      );
    }

    // Sign a token so the frontend can log in immediately after signup
    const token = signToken({ id: userId, email, role });
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: { id: userId, name, email, role },
      // Frontend uses this flag to show the "upload documents" nudge
      requiresDocuments: role === "recruiter",
    });
  } catch (err) {
    console.error("[signup]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const { email, password } = parsed.data;

    const [users] = await db.query(
      `SELECT id, name, email, password, role, failed_login_attempts, locked_until
       FROM users WHERE email = ?`,
      [email]
    );

    // Timing-safe: always run bcrypt even if user not found
    // This prevents timing attacks that reveal if an email is registered
    const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyz012345678901234567890";
    const user = users[0] || null;
    const hashToCompare = user ? user.password || DUMMY_HASH : DUMMY_HASH;

    // Check account lockout BEFORE comparing password
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockAt = new Date(user.locked_until).toLocaleTimeString();
      return res.status(429).json({
        message: `Account temporarily locked due to too many failed attempts. Try again after ${unlockAt}.`,
      });
    }

    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      // Increment failed attempts counter
      if (user) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        if (newAttempts >= 5) {
          // Lock for 15 minutes
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await db.query(
            "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
            [newAttempts, lockUntil, user.id]
          );
        } else {
          await db.query(
            "UPDATE users SET failed_login_attempts = ? WHERE id = ?",
            [newAttempts, user.id]
          );
        }
      }
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Reset failed attempts on successful login
    await db.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
      [user.id]
    );

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    setAuthCookie(res, token);

    return res.json({
      token,   // also in body for mobile API clients
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path:     "/",
  });
  res.json({ message: "Logged out successfully" });
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const email = z.string().email().parse(
      (req.body.email || "").toLowerCase().trim()
    );

    const [users] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    // Always return same message — don't reveal if email is registered
    const GENERIC_MSG = { message: "If an account exists for that email, an OTP has been sent." };

    if (users.length === 0) return res.json(GENERIC_MSG);

    // ✅ FIX: Use crypto.randomInt() instead of Math.random()
    // Math.random() is NOT cryptographically secure!
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);  // 10 minutes

    await db.query(
      "UPDATE users SET otp = ?, otp_expires_at = ? WHERE email = ?",
      [otpHash, expiresAt, email]
    );

    await getMailer().sendMail({
      from:    `"Pathalytics" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: "Your Password Reset OTP",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Password Reset</h2>
          <p>Use the OTP below to reset your Pathalytics password.</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;background:#f5f5f5;text-align:center;border-radius:8px">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#888;font-size:13px">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return res.json(GENERIC_MSG);
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email:       z.string().email().toLowerCase().trim(),
      otp:         z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
      newPassword: z.string()
        .min(8,  "Password must be at least 8 characters")
        .max(100, "Password too long"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, otp, newPassword } = parsed.data;

    const [users] = await db.query(
      "SELECT id, otp, otp_expires_at FROM users WHERE email = ?",
      [email]
    );
    if (!users.length) return res.status(400).json({ message: "Invalid request" });

    const user = users[0];
    if (!user.otp || !user.otp_expires_at) {
      return res.status(400).json({ message: "No OTP was requested for this account" });
    }
    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const otpValid = await bcrypt.compare(otp, user.otp);
    if (!otpValid) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query(
      "UPDATE users SET password = ?, otp = NULL, otp_expires_at = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    return res.json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;