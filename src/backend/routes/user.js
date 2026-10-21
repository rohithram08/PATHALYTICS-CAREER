// src/backend/routes/user.js  — UPDATED (replaces or extends existing)
// Handles: profile, stats, saved careers, messages, settings, account deletion
import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { upload, validateUploadedFile, cleanupUpload } from "../middleware/upload.js";
import { uploadLimiter, requireWhitelistedOrigin } from "../middleware/security.js";
import { authLimiter } from "../middleware/security.js";

const router = express.Router();
router.use(requireAuth);

// ── GET /api/user/me ──────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, avatar_url, bio,
              email_verified, two_factor_enabled, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[user/me]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/user/stats ───────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;

    const [[{ saved_careers }]] = await db.query(
      "SELECT COUNT(*) AS saved_careers FROM saved_careers WHERE user_id = ?",
      [userId]
    );
    const [[{ completed_interviews }]] = await db.query(
      "SELECT COUNT(*) AS completed_interviews FROM interview_sessions WHERE user_id = ? AND completed_at IS NOT NULL",
      [userId]
    );
    const [[{ career_recommendations }]] = await db.query(
      "SELECT COUNT(*) AS career_recommendations FROM career_recommendations WHERE user_id = ?",
      [userId]
    );

    // Calculate profile completion
    const [user] = await db.query(
      "SELECT name, email, avatar_url, bio FROM users WHERE id = ?",
      [userId]
    );
    const u = user[0];
    let pct = 20; // base for having an account
    if (u.name) pct += 20;
    if (u.email) pct += 20;
    if (u.avatar_url) pct += 20;
    if (u.bio) pct += 20;

    return res.json({
      saved_careers,
      completed_interviews,
      career_recommendations,
      profile_completion: pct,
    });
  } catch (err) {
    console.error("[user/stats]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /api/user/profile ─────────────────────────────────────
router.put("/profile", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      bio:  z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    await db.query("UPDATE users SET ? WHERE id = ?", [{ ...parsed.data, updated_at: new Date() }, req.user.id]);
    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("[user/profile]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/user/avatar ─────────────────────────────────────
router.post(
  "/avatar",
  requireWhitelistedOrigin,
  uploadLimiter,
  upload.single("avatar"),
  validateUploadedFile,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      // In production: upload req.file to S3/Cloudinary, store the URL
      // Here: store base64 in DB (for demo — replace with CDN in prod)
      const fs = await import("fs");
      const data = fs.readFileSync(req.file.path);
      const b64 = `data:${req.file.detectedMime || req.file.mimetype};base64,${data.toString("base64")}`;

      await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [b64, req.user.id]);
      cleanupUpload(req.file);

      return res.json({ message: "Avatar updated", avatar_url: b64 });
    } catch (err) {
      cleanupUpload(req.file);
      console.error("[user/avatar]", err);
      return res.status(500).json({ message: "Failed to upload avatar" });
    }
  }
);

// ── POST /api/user/change-password ───────────────────────────
router.post("/change-password", authLimiter, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string()
        .min(8,   "At least 8 characters")
        .max(100, "Too long")
        .regex(/[A-Z]/, "Must include an uppercase letter")
        .regex(/[a-z]/, "Must include a lowercase letter")
        .regex(/[0-9]/, "Must include a number")
        .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(parsed.data.currentPassword, rows[0].password || "");
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("[user/change-password]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/user/messages ────────────────────────────────────
router.get("/messages", async (req, res) => {
  try {
    const [messages] = await db.query(
      `SELECT m.id, m.subject, m.body, m.read_at, m.created_at,
              u.name AS sender_name, u.email AS sender_email, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ?
       ORDER BY m.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(messages);
  } catch (err) {
    console.error("[user/messages]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /api/user/messages/:id/read ────────────────────────
router.patch("/messages/:id/read", async (req, res) => {
  try {
    await db.query(
      "UPDATE messages SET read_at = NOW() WHERE id = ? AND recipient_id = ? AND read_at IS NULL",
      [req.params.id, req.user.id]
    );
    return res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("[user/messages/read]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/user/saved-careers ───────────────────────────────
router.get("/saved-careers", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, career_title, career_data, saved_at FROM saved_careers WHERE user_id = ? ORDER BY saved_at DESC",
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[user/saved-careers]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/user/saved-careers ──────────────────────────────
router.post("/saved-careers", async (req, res) => {
  try {
    const schema = z.object({
      career_title: z.string().min(1).max(255),
      career_data:  z.record(z.unknown()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed" });
    }
    await db.query(
      `INSERT INTO saved_careers (user_id, career_title, career_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE career_data = VALUES(career_data), saved_at = NOW()`,
      [req.user.id, parsed.data.career_title, JSON.stringify(parsed.data.career_data || {})]
    );
    return res.status(201).json({ message: "Career saved" });
  } catch (err) {
    console.error("[user/saved-careers POST]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /api/user/saved-careers/:id ───────────────────────
router.delete("/saved-careers/:id", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM saved_careers WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    return res.json({ message: "Removed" });
  } catch (err) {
    console.error("[user/saved-careers DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /api/user/account ──────────────────────────────────
// GDPR right-to-erasure: permanently deletes user and all data
router.delete("/account", authLimiter, async (req, res) => {
  try {
    const schema = z.object({ password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Password required to delete account" });

    const [rows] = await db.query("SELECT password, role FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    // Prevent accidental admin deletion
    if (rows[0].role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be self-deleted" });
    }

    const valid = await bcrypt.compare(parsed.data.password, rows[0].password || "");
    if (!valid) return res.status(400).json({ message: "Incorrect password" });

    // Cascade deletes via FK ON DELETE CASCADE — single query
    await db.query("DELETE FROM users WHERE id = ?", [req.user.id]);

    res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "strict" });
    return res.json({ message: "Account permanently deleted" });
  } catch (err) {
    console.error("[user/account DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;