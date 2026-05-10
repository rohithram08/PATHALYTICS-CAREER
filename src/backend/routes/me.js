// src/backend/routes/me.js
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db from "../db.js";

const router = express.Router();

// ── Auth middleware ──────────────────────────────────────────
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ── GET /me ──────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const [userRows] = await db.query(
      `SELECT
         id, name, email, role,
         avatar_url AS avatar,
         email_verified,
         created_at AS createdAt,
         CASE WHEN password = '' OR password IS NULL THEN 0 ELSE 1 END AS has_password
       FROM users
       WHERE id = ?`,
      [req.userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [providers] = await db.query(
      `SELECT provider, provider_email, linked_at
       FROM user_providers
       WHERE user_id = ?`,
      [req.userId]
    );

    const user = userRows[0];

    res.json({
      user: {
        ...user,
        has_password: !!user.has_password,
        providers: providers.map((p) => ({
          name: p.provider,
          email: p.provider_email,
          linkedAt: p.linked_at,
        })),
      },
    });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /me ────────────────────────────────────────────────
const updateMeSchema = z.object({
  name: z.string().min(2).max(60).trim().optional(),
  avatar: z.string().nullable().optional(),
});

router.patch("/me", authenticate, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, avatar } = parsed.data;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (avatar !== undefined) {
      if (avatar && avatar.length > 2_800_000) {
        return res.status(400).json({ message: "Avatar too large (max 2 MB)" });
      }
      fields.push("avatar_url = ?");
      values.push(avatar);
    }

    if (!fields.length) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    values.push(req.userId);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const [userRows] = await db.query(
      `SELECT
         id, name, email, role,
         avatar_url AS avatar,
         email_verified,
         created_at AS createdAt,
         CASE WHEN password = '' OR password IS NULL THEN 0 ELSE 1 END AS has_password
       FROM users
       WHERE id = ?`,
      [req.userId]
    );

    const [providers] = await db.query(
      `SELECT provider, provider_email, linked_at
       FROM user_providers
       WHERE user_id = ?`,
      [req.userId]
    );

    const user = userRows[0];

    res.json({
      user: {
        ...user,
        has_password: !!user.has_password,
        providers: providers.map((p) => ({
          name: p.provider,
          email: p.provider_email,
          linkedAt: p.linked_at,
        })),
      },
    });
  } catch (err) {
    console.error("PATCH /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /providers/:provider ──────────────────────────────
router.delete("/providers/:provider", authenticate, async (req, res) => {
  try {
    const { provider } = req.params;

    const [userRows] = await db.query(
      `SELECT password FROM users WHERE id = ?`,
      [req.userId]
    );

    const [allProviders] = await db.query(
      `SELECT provider FROM user_providers WHERE user_id = ?`,
      [req.userId]
    );

    const hasPassword =
      !!userRows[0]?.password && userRows[0].password !== "";

    const otherProviders = allProviders.filter((p) => p.provider !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      return res.status(400).json({
        message:
          "Cannot unlink your only sign-in method. Set a password first.",
      });
    }

    await db.query(
      `DELETE FROM user_providers WHERE user_id = ? AND provider = ?`,
      [req.userId, provider]
    );

    res.json({ message: `${provider} unlinked successfully` });
  } catch (err) {
    console.error("DELETE /providers/:provider error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /me ───────────────────────────────────────────────
router.delete("/me", authenticate, async (req, res) => {
  try {
    // FK cascade handles user_providers, user_sessions, audit_logs
    await db.query(`DELETE FROM users WHERE id = ?`, [req.userId]);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("DELETE /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;