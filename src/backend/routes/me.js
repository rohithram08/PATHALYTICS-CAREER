// src/backend/routes/me.js
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db from "../db.js";

const router = express.Router();

// ── Auth middleware ──────────────────────────────────────────
// Local alias kept so existing callers of this file still work.
// The canonical version (with cookie support) lives in middleware/auth.js.
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


// ── Candidate profile (student recruiter-visibility) ─────────
// Students fill this in so recruiters can find and match them.
// Nothing here is visible to anyone unless is_visible_to_recruiters
// is true AND the student has explicitly set it.

const candidateProfileSchema = z.object({
  fullName:              z.string().max(150).trim().optional(),
  phone:                 z.string().max(20).trim().optional(),
  location:              z.string().max(150).trim().optional(),
  linkedinUrl:           z.string().url().optional().or(z.literal("")),
  githubUrl:             z.string().url().optional().or(z.literal("")),
  portfolioUrl:          z.string().url().optional().or(z.literal("")),
  yearsOfExperience:     z.string().max(20).trim().optional(),
  currentRole:           z.string().max(150).trim().optional(),
  currentCompany:        z.string().max(150).trim().optional(),
  expectedSalary:        z.string().max(50).trim().optional(),
  noticePeriod:          z.string().max(50).trim().optional(),
  skills:                z.array(z.string().max(60).trim()).max(40).optional(),
  isVisibleToRecruiters: z.boolean().optional(),
});

router.get("/me/candidate-profile", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      // `current_role` is a reserved word in TiDB/MySQL — must be backticked
      // in every SELECT, INSERT, and UPDATE that references this column.
      `SELECT full_name, phone, location, linkedin_url, github_url,
              portfolio_url, years_of_experience, \`current_role\`, current_company,
              expected_salary, notice_period, skills, is_visible_to_recruiters
       FROM candidate_profiles WHERE user_id = ?`,
      [req.userId]
    );
    if (rows.length === 0) {
      // Return an empty profile shape rather than 404 so the frontend
      // doesn't need to handle both "no row yet" and "row exists" cases.
      return res.json({ exists: false, isVisibleToRecruiters: false, skills: [] });
    }
    const row = rows[0];
    return res.json({
      exists:                true,
      fullName:              row.full_name,
      phone:                 row.phone,
      location:              row.location,
      linkedinUrl:           row.linkedin_url,
      githubUrl:             row.github_url,
      portfolioUrl:          row.portfolio_url,
      yearsOfExperience:     row.years_of_experience,
      currentRole:           row.current_role,
      currentCompany:        row.current_company,
      expectedSalary:        row.expected_salary,
      noticePeriod:          row.notice_period,
      skills: (() => { try { return JSON.parse(row.skills || "[]"); } catch { return []; } })(),
      isVisibleToRecruiters: !!row.is_visible_to_recruiters,
    });
  } catch (err) {
    console.error("GET /me/candidate-profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/me/candidate-profile", authenticate, async (req, res) => {
  try {
    const parsed = candidateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const d = parsed.data;

    // Upsert — creates the row if it doesn't exist yet.
    // `current_role` is backticked in the INSERT column list and in both
    // sides of the ON DUPLICATE KEY UPDATE assignment — reserved word.
    await db.query(
      `INSERT INTO candidate_profiles
         (user_id, full_name, phone, location, linkedin_url, github_url,
          portfolio_url, years_of_experience, \`current_role\`, current_company,
          expected_salary, notice_period, skills, is_visible_to_recruiters)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name               = COALESCE(?, full_name),
         phone                   = COALESCE(?, phone),
         location                = COALESCE(?, location),
         linkedin_url            = COALESCE(?, linkedin_url),
         github_url              = COALESCE(?, github_url),
         portfolio_url           = COALESCE(?, portfolio_url),
         years_of_experience     = COALESCE(?, years_of_experience),
         \`current_role\`        = COALESCE(?, \`current_role\`),
         current_company         = COALESCE(?, current_company),
         expected_salary         = COALESCE(?, expected_salary),
         notice_period           = COALESCE(?, notice_period),
         skills                  = COALESCE(?, skills),
         is_visible_to_recruiters = COALESCE(?, is_visible_to_recruiters)`,
      [
        req.userId,
        d.fullName ?? null, d.phone ?? null, d.location ?? null,
        d.linkedinUrl || null, d.githubUrl || null, d.portfolioUrl || null,
        d.yearsOfExperience ?? null, d.currentRole ?? null, d.currentCompany ?? null,
        d.expectedSalary ?? null, d.noticePeriod ?? null,
        d.skills ? JSON.stringify(d.skills) : null,
        d.isVisibleToRecruiters ?? null,
        // ON DUPLICATE KEY values (same order as UPDATE clause above)
        d.fullName ?? null, d.phone ?? null, d.location ?? null,
        d.linkedinUrl || null, d.githubUrl || null, d.portfolioUrl || null,
        d.yearsOfExperience ?? null, d.currentRole ?? null, d.currentCompany ?? null,
        d.expectedSalary ?? null, d.noticePeriod ?? null,
        d.skills ? JSON.stringify(d.skills) : null,
        d.isVisibleToRecruiters ?? null,
      ]
    );
    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("PATCH /me/candidate-profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;