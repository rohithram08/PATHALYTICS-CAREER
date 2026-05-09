// src/backend/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import db from "../db.js";

const router = express.Router();

// ============ Validation Schemas ============
const signupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

// ============ Rate Limiters ============
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Try again later." },
});

// ============ JWT Helper ============
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 chars");
}

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "1d", algorithm: "HS256" });

// ============ SIGNUP ============
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password } = parsed.data;

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Unable to register with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "user"]
    );

    return res.status(201).json({ message: "Account created successfully" });
  } catch (err) {
    console.error("[signup]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ============ LOGIN ============
router.post("/login", authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;

    const [users] = await db.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );

    const user = users[0];
    const dummyHash = "\$2b$12$abcdefghijklmnopqrstuv";
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ============ FORGOT PASSWORD ============
router.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const email = z.string().email().parse(req.body.email?.toLowerCase().trim());

    const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (users.length === 0) {
      return res.json({ message: "If an account exists, an OTP has been sent." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "UPDATE users SET otp = ?, otp_expires_at = ? WHERE email = ?",
      [otpHash, expiresAt, email]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Pathalytics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP is <b>${otp}</b>. Expires in 10 minutes.</p>`,
    });

    return res.json({ message: "If an account exists, an OTP has been sent." });
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ message: "Unable to process request" });
  }
});

// ============ RESET PASSWORD ============
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email().toLowerCase().trim(),
      otp: z.string().length(6),
      newPassword: z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const { email, otp, newPassword } = parsed.data;

    const [users] = await db.query(
      "SELECT id, otp, otp_expires_at FROM users WHERE email = ?",
      [email]
    );
    if (users.length === 0) return res.status(400).json({ message: "Invalid request" });

    const user = users[0];
    if (!user.otp || !user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ message: "OTP expired or not requested" });
    }

    const otpValid = await bcrypt.compare(otp, user.otp);
    if (!otpValid) return res.status(400).json({ message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query(
      "UPDATE users SET password = ?, otp = NULL, otp_expires_at = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ============ LOGOUT ============
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;