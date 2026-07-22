// src/backend/routes/me.js
// ─────────────────────────────────────────────────────────────
// Fixed in this pass: this file used to define its own local
// `authenticate` middleware that only checked the Authorization
// header. That meant any caller using the httpOnly cookie (which
// src/lib/api.ts's `authApi` does, with credentials:"include" and
// no Authorization header at all) got a 401 here even while fully
// logged in elsewhere in the app. Now uses the shared requireAuth
// from middleware/auth.js, which accepts either the cookie or the
// header — matching how the rest of the backend authenticates.
// ─────────────────────────────────────────────────────────────
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireAuth, authCookieOptions } from "../middleware/auth.js";

const router = express.Router();

// Kept as a named export for backward compatibility with any other
// file that might still import { authenticate } from here.
export const authenticate = requireAuth;

// ── GET /me ──────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
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
      [req.user.id]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [providers] = await db.query(
      `SELECT provider, provider_email, linked_at
       FROM user_providers
       WHERE user_id = ?`,
      [req.user.id]
    );

    const user = userRows[0];
    let verificationStatus;

    if (user.role === "recruiter") {
      const [[profile]] = await db.query(
        "SELECT verification_status FROM recruiter_profiles WHERE user_id = ?",
        [req.user.id]
      );
      verificationStatus = profile?.verification_status; // 'pending' | 'approved' | 'rejected'
    }

    res.json({
      user: {
        ...user,
        has_password: !!user.has_password,
        verificationStatus,
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

router.patch("/me", requireAuth, async (req, res) => {
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

    values.push(req.user.id);
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
      [req.user.id]
    );

    const [providers] = await db.query(
      `SELECT provider, provider_email, linked_at
       FROM user_providers
       WHERE user_id = ?`,
      [req.user.id]
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
router.delete("/providers/:provider", requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;

    const [userRows] = await db.query(`SELECT password FROM users WHERE id = ?`, [req.user.id]);
    const [allProviders] = await db.query(
      `SELECT provider FROM user_providers WHERE user_id = ?`,
      [req.user.id]
    );

    const hasPassword = !!userRows[0]?.password && userRows[0].password !== "";
    const otherProviders = allProviders.filter((p) => p.provider !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      return res.status(400).json({
        message: "Cannot unlink your only sign-in method. Set a password first.",
      });
    }

    await db.query(
      `DELETE FROM user_providers WHERE user_id = ? AND provider = ?`,
      [req.user.id, provider]
    );

    res.json({ message: `${provider} unlinked successfully` });
  } catch (err) {
    console.error("DELETE /providers/:provider error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /me ───────────────────────────────────────────────
// This is the account-deletion endpoint the frontend actually calls
// (Settings.tsx → DELETE /api/auth/me). Previously this just deleted on
// requireAuth alone — a stolen/leftover session token, with no further
// confirmation, was enough to permanently destroy the account. Now it
// re-checks the password for accounts that have one (the same standard
// bcrypt.compare pattern used everywhere else in this backend), blocks
// self-deleting an admin account, and clears the cookie afterward so a
// stale token doesn't linger client-side pointing at a deleted user.
const deleteAccountSchema = z.object({ password: z.string().optional() });

router.delete("/me", requireAuth, async (req, res) => {
  try {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const [rows] = await db.query("SELECT password, role FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    if (rows[0].role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be self-deleted" });
    }

    const hasPassword = !!rows[0].password;
    if (hasPassword) {
      if (!parsed.data.password) {
        return res.status(400).json({ message: "Password is required to delete your account" });
      }
      const valid = await bcrypt.compare(parsed.data.password, rows[0].password);
      if (!valid) {
        return res.status(400).json({ message: "Incorrect password" });
      }
    }
    // OAuth-only accounts (has_password false) have no password to check
    // against — the confirmation dialog + valid session is what's available
    // for those accounts.

    // FK cascade handles user_providers, applications, jobs, etc.
    await db.query(`DELETE FROM users WHERE id = ?`, [req.user.id]);

    res.clearCookie("token", authCookieOptions());

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
//
// Naukri-style expansion (this pass): workExperience / education /
// projects / preferredLocations — each a small array of free-form
// objects, stored as JSON exactly like `skills` already was.

const experienceEntry = z.object({
  title: z.string().max(150),
  company: z.string().max(150),
  startDate: z.string().max(20).optional(),
  endDate: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
});
const educationEntry = z.object({
  degree: z.string().max(150),
  institution: z.string().max(200),
  startYear: z.string().max(10).optional(),
  endYear: z.string().max(10).optional(),
});
const projectEntry = z.object({
  title: z.string().max(150),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional().or(z.literal("")),
  techStack: z.array(z.string().max(40)).max(20).optional(),
});

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
  workExperience:        z.array(experienceEntry).max(20).optional(),
  education:             z.array(educationEntry).max(10).optional(),
  projects:              z.array(projectEntry).max(20).optional(),
  preferredLocations:    z.array(z.string().max(100)).max(10).optional(),
  isVisibleToRecruiters: z.boolean().optional(),
});

const parseJsonArray = (raw) => {
  try {
    const val = JSON.parse(raw || "[]");
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
};

router.get("/me/candidate-profile", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      // `current_role` is a reserved word in TiDB/MySQL — must be backticked
      // in every SELECT, INSERT, and UPDATE that references this column.
      `SELECT full_name, phone, location, linkedin_url, github_url,
              portfolio_url, years_of_experience, \`current_role\`, current_company,
              expected_salary, notice_period, skills,
              work_experience, education, projects, preferred_locations,
              is_visible_to_recruiters
       FROM candidate_profiles WHERE user_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({
        exists: false, isVisibleToRecruiters: false,
        skills: [], workExperience: [], education: [], projects: [], preferredLocations: [],
      });
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
      skills:                parseJsonArray(row.skills),
      workExperience:        parseJsonArray(row.work_experience),
      education:             parseJsonArray(row.education),
      projects:              parseJsonArray(row.projects),
      preferredLocations:    parseJsonArray(row.preferred_locations),
      isVisibleToRecruiters: !!row.is_visible_to_recruiters,
    });
  } catch (err) {
    console.error("GET /me/candidate-profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/me/candidate-profile", requireAuth, async (req, res) => {
  try {
    const parsed = candidateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const d = parsed.data;
    const j = (v) => (v ? JSON.stringify(v) : null);

    // Upsert — creates the row if it doesn't exist yet.
    // `current_role` is backticked in the INSERT column list and in both
    // sides of the ON DUPLICATE KEY UPDATE assignment — reserved word.
    await db.query(
      `INSERT INTO candidate_profiles
         (user_id, full_name, phone, location, linkedin_url, github_url,
          portfolio_url, years_of_experience, \`current_role\`, current_company,
          expected_salary, notice_period, skills,
          work_experience, education, projects, preferred_locations,
          is_visible_to_recruiters)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
         work_experience         = COALESCE(?, work_experience),
         education               = COALESCE(?, education),
         projects                = COALESCE(?, projects),
         preferred_locations     = COALESCE(?, preferred_locations),
         is_visible_to_recruiters = COALESCE(?, is_visible_to_recruiters)`,
      [
        req.user.id,
        d.fullName ?? null, d.phone ?? null, d.location ?? null,
        d.linkedinUrl || null, d.githubUrl || null, d.portfolioUrl || null,
        d.yearsOfExperience ?? null, d.currentRole ?? null, d.currentCompany ?? null,
        d.expectedSalary ?? null, d.noticePeriod ?? null,
        j(d.skills), j(d.workExperience), j(d.education), j(d.projects), j(d.preferredLocations),
        d.isVisibleToRecruiters ?? null,
        // ON DUPLICATE KEY values (same order as UPDATE clause above)
        d.fullName ?? null, d.phone ?? null, d.location ?? null,
        d.linkedinUrl || null, d.githubUrl || null, d.portfolioUrl || null,
        d.yearsOfExperience ?? null, d.currentRole ?? null, d.currentCompany ?? null,
        d.expectedSalary ?? null, d.noticePeriod ?? null,
        j(d.skills), j(d.workExperience), j(d.education), j(d.projects), j(d.preferredLocations),
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
