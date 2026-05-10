// src/backend/routes/password.js
import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import db from "../db.js";
import { authenticate } from "./me.js";

const router = express.Router();

// ── Set password (social-only users) ────────────────────────
router.post("/set-password", authenticate, async (req, res) => {
  const schema = z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, password FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = rows[0].password;
    if (existing && existing !== "") {
      return res.status(400).json({
        message: "Password already set. Use change password instead.",
      });
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12);
    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [
      hashed,
      req.userId,
    ]);

    res.json({ message: "Password set successfully" });
  } catch (err) {
    console.error("POST /set-password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Change password (users with existing password) ──────────
router.post("/change-password", authenticate, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, password FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    if (!user.password || user.password === "") {
      return res.status(400).json({
        message: "No password set. Use set password instead.",
      });
    }

    const isMatch = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [
      hashed,
      req.userId,
    ]);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("POST /change-password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;