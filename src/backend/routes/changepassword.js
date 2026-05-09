// src/backend/routes/changepassword.js
import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const { currentPassword, newPassword } = parsed.data;
    const userId = req.user.id; // 🔒 from JWT, NOT body

    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[change-password]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;