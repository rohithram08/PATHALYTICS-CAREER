// src/backend/routes/recruiter.js
// ─────────────────────────────────────────────────────────────
// Recruiter dashboard API
//
// All routes require: requireAuth + requireRecruiter
//
// ── Fixed in this pass (schema drift audit) ───────────────────
// Every query in this file previously referenced a `job_postings`
// table and an `applications.stage` column — neither exists.
// db.js has only ever created `jobs` and `applications.status`.
// Every endpoint below 500'd on every call. They now query the
// real tables. The `stage` key name is preserved in JSON responses
// (aliased from `status`) so RecruiterDashboard.tsx and
// RecruiterCandidates.tsx — which already expect `stage` — don't
// need to change.
//
// Two frontend pages currently share GET /candidates with different
// query params and response shapes (a "Doc 2" duplication):
//   • RecruiterCandidates.tsx sends ?page&limit&q&stage  → pipeline mode
//   • CandidatesList.tsx      sends ?search&skill        → directory mode
// This route branches on the presence of `page` to tell them apart.
// Worth splitting into two explicitly-named endpoints later.
//
// New in this pass (previously called by the frontend but missing
// entirely — GET/POST/DELETE /documents, GET /candidates/match/:jobId,
// GET /resumes/:id/download): see the "NEW" markers below.
// ─────────────────────────────────────────────────────────────

import express from "express";
import path from "path";
import fs from "fs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRecruiter } from "../middleware/auth.js";
import { upload, validateUploadedFile, cleanupUpload } from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/security.js";
import { checkStatusTransition, RECRUITER_SETTABLE_STATUSES } from "../utils/atsTransitions.js";
import { sendNotification } from "../utils/emailService.js";

const router = express.Router();
router.use(requireAuth, requireRecruiter);

// ── Schemas ───────────────────────────────────────────────────
// Field names match what RecruiterJobForm.tsx already sends — mapped
// onto the real `jobs` columns inside the handlers below.
const jobFormSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(10000),
  location: z.string().max(200).optional(),
  salary_min: z.number().int().positive().optional(),
  salary_max: z.number().int().positive().optional(),
  employment_type: z.enum(["full-time", "part-time", "contract", "internship", "remote"]).optional(),
  experience_level: z.enum(["entry", "mid", "senior", "lead", "director", "any"]).optional(),
  skills: z.array(z.string().max(60)).max(20).optional(),
  deadline: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
});

const candidateStatusSchema = z.object({
  stage: z.enum(RECRUITER_SETTABLE_STATUSES),
  notes: z.string().max(2000).optional(),
});

const messageSchema = z.object({
  recipient_id: z.number().int().positive(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

const documentUploadSchema = z.object({
  document_type: z.enum(["incorporation_certificate", "gst_certificate", "company_pan", "other"]),
});

// ── Helpers ───────────────────────────────────────────────────
async function getRecruiterProfile(userId) {
  const [rows] = await db.query(
    "SELECT * FROM recruiter_profiles WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
}

// experience_level in RecruiterJobForm has no "director"/"any" option, so
// only translate the values it actually sends; jobs.js's own experience
// levels stay untouched for jobs created through that flow.
const EMPLOYMENT_TYPE_TO_JOB_TYPE = {
  "full-time": "full-time", "part-time": "part-time",
  contract: "contract", internship: "internship", remote: "remote",
};

// ── GET /dashboard ────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const recruiterUserId = req.user.id;

    const [[jobStats]] = await db.query(
      `SELECT
         COUNT(*) AS total_jobs,
         SUM(status = 'published') AS active_jobs,
         SUM(status = 'closed') AS closed_jobs
       FROM jobs WHERE recruiter_id = ?`,
      [recruiterUserId]
    );

    const [[appStats]] = await db.query(
      `SELECT
         COUNT(*) AS total_applications,
         SUM(a.status = 'screening') AS screening,
         SUM(a.status = 'interview') AS interviews,
         SUM(a.status = 'offer')     AS offers,
         SUM(a.status = 'hired')     AS hired,
         SUM(a.status = 'rejected')  AS rejected
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ?`,
      [recruiterUserId]
    );

    const [[viewStats]] = await db.query(
      `SELECT COALESCE(SUM(views),0) AS total_views
       FROM jobs WHERE recruiter_id = ?`,
      [recruiterUserId]
    );

    // 30-day trend
    const [trend] = await db.query(
      `SELECT DATE(a.applied_at) AS day, COUNT(*) AS count
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ? AND a.applied_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(a.applied_at)
       ORDER BY day ASC`,
      [recruiterUserId]
    );

    // Recent applications
    const [recent] = await db.query(
      `SELECT a.id, a.status AS stage, a.applied_at AS created_at,
              u.name AS candidate_name, u.email AS candidate_email,
              j.title AS job_title
       FROM applications a
       JOIN users u ON a.user_id = u.id
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ?
       ORDER BY a.applied_at DESC LIMIT 10`,
      [recruiterUserId]
    );

    return res.json({
      jobs: jobStats,
      applications: appStats,
      views: viewStats,
      trend,
      recent_applications: recent,
    });
  } catch (err) {
    console.error("[recruiter/dashboard]", err);
    return res.status(500).json({ message: "Failed to load dashboard" });
  }
});

// ── GET /profile ──────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  try {
    const profile = await getRecruiterProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    return res.json(profile);
  } catch (err) {
    console.error("[recruiter/profile GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /profile ──────────────────────────────────────────────
router.put("/profile", async (req, res) => {
  try {
    const schema = z.object({
      company_name: z.string().min(1).max(255).optional(),
      company_size: z.enum(["1-10","11-50","51-200","201-500","501-1000","1000+"]).optional(),
      industry: z.string().max(100).optional(),
      company_website: z.string().url().max(500).optional().nullable(),
      designation: z.string().max(200).optional(),
      bio: z.string().max(2000).optional(),
      linkedin_url: z.string().url().max(500).optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    await db.query(
      `UPDATE recruiter_profiles SET ? WHERE user_id = ?`,
      [{ ...parsed.data, updated_at: new Date() }, req.user.id]
    );

    const profile = await getRecruiterProfile(req.user.id);
    return res.json({ message: "Profile updated", profile });
  } catch (err) {
    console.error("[recruiter/profile PUT]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /jobs — used by RecruiterJobForm.tsx ───────────────────
router.get("/jobs", async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = "WHERE j.recruiter_id = ?";
    const params = [req.user.id];

    if (active === "true") { where += " AND j.status = 'published'"; }
    else if (active === "false") { where += " AND j.status != 'published'"; }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM jobs j ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT j.*,
              COUNT(DISTINCT a.id) AS application_count,
              COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END) AS hired_count
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       ${where}
       GROUP BY j.id
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Present the flat is_active/employment_type/deadline shape this form expects.
    const jobs = rows.map((j) => ({
      ...j,
      employment_type: j.job_type,
      is_active: j.status === "published" ? 1 : 0,
      deadline: j.closed_at,
    }));

    return res.json({ jobs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[recruiter/jobs GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /jobs ────────────────────────────────────────────────
router.post("/jobs", async (req, res) => {
  try {
    const parsed = jobFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    const data = parsed.data;

    const [result] = await db.query(
      `INSERT INTO jobs
         (recruiter_id, title, description, location, job_type, experience_level,
          salary_min, salary_max, skills, status, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, data.title, data.description, data.location || "Remote",
        EMPLOYMENT_TYPE_TO_JOB_TYPE[data.employment_type] || "full-time",
        data.experience_level || "any",
        data.salary_min || null, data.salary_max || null,
        JSON.stringify(data.skills || []),
        data.is_active ? "published" : "draft",
        data.deadline || null,
      ]
    );

    if (data.is_active) {
      await db.query("UPDATE jobs SET published_at = NOW() WHERE id = ?", [result.insertId]);
    }

    return res.status(201).json({ message: "Job posted", id: result.insertId });
  } catch (err) {
    console.error("[recruiter/jobs POST]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /jobs/:id ─────────────────────────────────────────────
router.put("/jobs/:id", async (req, res) => {
  try {
    const [existing] = await db.query(
      "SELECT id, status FROM jobs WHERE id = ? AND recruiter_id = ?",
      [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ message: "Job not found" });

    const parsed = jobFormSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    const d = parsed.data;

    const updates = { updated_at: new Date() };
    if (d.title !== undefined) updates.title = d.title;
    if (d.description !== undefined) updates.description = d.description;
    if (d.location !== undefined) updates.location = d.location;
    if (d.salary_min !== undefined) updates.salary_min = d.salary_min;
    if (d.salary_max !== undefined) updates.salary_max = d.salary_max;
    if (d.employment_type !== undefined) updates.job_type = EMPLOYMENT_TYPE_TO_JOB_TYPE[d.employment_type] || "full-time";
    if (d.experience_level !== undefined) updates.experience_level = d.experience_level;
    if (d.skills !== undefined) updates.skills = JSON.stringify(d.skills);
    if (d.deadline !== undefined) updates.closed_at = d.deadline;
    if (d.is_active !== undefined) {
      updates.status = d.is_active ? "published" : "draft";
      if (d.is_active && existing[0].status !== "published") updates.published_at = new Date();
    }

    await db.query("UPDATE jobs SET ? WHERE id = ?", [updates, req.params.id]);
    return res.json({ message: "Job updated" });
  } catch (err) {
    console.error("[recruiter/jobs PUT]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /jobs/:id ──────────────────────────────────────────
router.delete("/jobs/:id", async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM jobs WHERE id = ? AND recruiter_id = ?",
      [req.params.id, req.user.id]
    );

    if (!result.affectedRows) return res.status(404).json({ message: "Job not found" });
    return res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("[recruiter/jobs DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /candidates ──────────────────────────────────────────
// Branches on the presence of `page` (always sent by RecruiterCandidates.tsx,
// never sent by CandidatesList.tsx) — see file header note.
router.get("/candidates", async (req, res) => {
  const isPipelineMode = req.query.page !== undefined || req.query.stage !== undefined;
  if (isPipelineMode) return handlePipelineCandidates(req, res);
  return handleDirectoryCandidates(req, res);
});

// "My applicants" — grouped by application, scoped to this recruiter's jobs.
async function handlePipelineCandidates(req, res) {
  try {
    const { job_id, stage, q, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = "WHERE j.recruiter_id = ?";
    const params = [req.user.id];

    if (job_id) { where += " AND a.job_id = ?"; params.push(job_id); }
    if (stage)  { where += " AND a.status = ?"; params.push(stage); }
    if (q) {
      where += " AND (u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.user_id = u.id
       ${where}`,
      params
    );

    const [candidates] = await db.query(
      `SELECT a.id AS application_id, a.status AS stage, a.cover_note AS notes,
              a.applied_at,
              u.id AS user_id, u.name, u.email, u.avatar_url,
              j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.applied_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return res.json({ candidates, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[recruiter/candidates pipeline]", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// "Candidate directory" — every candidate who has opted in to being
// visible, independent of whether they've applied to any of this
// recruiter's jobs. Returns a plain array (matches CandidatesList.tsx).
async function handleDirectoryCandidates(req, res) {
  try {
    const { search, skill } = req.query;

    let where = "WHERE cp.is_visible_to_recruiters = 1";
    const params = [];

    if (search) {
      where += " AND (u.name LIKE ? OR cp.current_role LIKE ? OR cp.current_company LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (skill) {
      where += " AND JSON_SEARCH(cp.skills, 'one', ?) IS NOT NULL";
      params.push(`%${skill}%`);
    }

    const [rows] = await db.query(
      `SELECT u.id, u.name, cp.location, cp.\`current_role\`, cp.current_company,
              cp.years_of_experience, cp.skills, cp.linkedin_url, cp.github_url,
              cp.portfolio_url
       FROM candidate_profiles cp
       JOIN users u ON u.id = cp.user_id
       ${where}
       ORDER BY cp.updated_at DESC
       LIMIT 100`,
      params
    );

    const candidates = rows.map((c) => ({
      ...c,
      skills: (() => { try { return JSON.parse(c.skills || "[]"); } catch { return []; } })(),
    }));

    return res.json(candidates);
  } catch (err) {
    console.error("[recruiter/candidates directory]", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ── GET /candidates/match/:jobId — NEW ─────────────────────────
// Simple, explainable skill-overlap ranking (not an opaque "AI match") —
// ranks opted-in candidates by how many of the job's listed skills they share.
router.get("/candidates/match/:jobId", async (req, res) => {
  try {
    const [jobRows] = await db.query(
      "SELECT id, title, skills FROM jobs WHERE id = ? AND recruiter_id = ?",
      [req.params.jobId, req.user.id]
    );
    if (!jobRows.length) return res.status(404).json({ message: "Job not found" });
    const job = jobRows[0];

    let jobSkills = [];
    try { jobSkills = JSON.parse(job.skills || "[]"); } catch { /* leave empty */ }
    const jobSkillsLower = jobSkills.map((s) => String(s).toLowerCase());

    const [rows] = await db.query(
      `SELECT u.id, u.name, cp.location, cp.\`current_role\`, cp.current_company,
              cp.years_of_experience, cp.skills, cp.linkedin_url, cp.github_url
       FROM candidate_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.is_visible_to_recruiters = 1`
    );

    const ranked = rows
      .map((c) => {
        let skills = [];
        try { skills = JSON.parse(c.skills || "[]"); } catch { /* leave empty */ }
        const matchedSkills = jobSkillsLower.length
          ? skills.filter((s) => jobSkillsLower.includes(String(s).toLowerCase()))
          : [];
        return { ...c, skills, matchedSkills, matchScore: matchedSkills.length };
      })
      .filter((c) => jobSkillsLower.length === 0 || c.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);

    return res.json({ job: { id: job.id, title: job.title }, candidates: ranked });
  } catch (err) {
    console.error("[recruiter/candidates/match]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /candidates/:id ───────────────────────────────────────
router.get("/candidates/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id AS application_id, a.status AS stage, a.cover_note AS notes,
              a.applied_at, a.resume_storage_key,
              u.id AS user_id, u.name, u.email, u.avatar_url,
              j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN users u ON a.user_id = u.id
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = ? AND j.recruiter_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Application not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[recruiter/candidates/:id GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /candidates/:id/status ─────────────────────────────────
router.post("/candidates/:id/status", async (req, res) => {
  try {
    const parsed = candidateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    const [check] = await db.query(
      `SELECT a.id, a.status, a.user_id, a.job_id, j.title AS job_title,
              candidate.name AS candidate_name, candidate.email AS candidate_email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users candidate ON candidate.id = a.user_id
       WHERE a.id = ? AND j.recruiter_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ message: "Application not found" });
    const application = check[0];

    const transition = checkStatusTransition(application.status, parsed.data.stage);
    if (!transition.ok) {
      return res.status(409).json({ message: transition.reason });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        "UPDATE applications SET status = ?, cover_note = COALESCE(?, cover_note) WHERE id = ?",
        [parsed.data.stage, parsed.data.notes ?? null, req.params.id]
      );
      await conn.query(
        `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, application.status, parsed.data.stage, req.user.id]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    sendNotification("application_status_changed", {
      to: application.candidate_email,
      userId: application.user_id,
      role: "user",
      applicationId: application.id,
      jobId: application.job_id,
      jobTitle: application.job_title,
      status: parsed.data.stage,
    });

    return res.json({ message: "Status updated", stage: parsed.data.stage });
  } catch (err) {
    console.error("[recruiter/candidates status]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /analytics ────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const recruiterUserId = req.user.id;

    const [funnel] = await db.query(
      `SELECT a.status AS stage, COUNT(*) AS count
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ?
       GROUP BY a.status`,
      [recruiterUserId]
    );

    const [dailyApps] = await db.query(
      `SELECT DATE(a.applied_at) AS date, COUNT(*) AS count
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ?
         AND a.applied_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(a.applied_at)
       ORDER BY date`,
      [recruiterUserId, Number(days)]
    );

    const [topJobs] = await db.query(
      `SELECT j.title, j.id,
              COUNT(DISTINCT a.id) AS applications,
              j.views
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = ?
       GROUP BY j.id
       ORDER BY applications DESC LIMIT 5`,
      [recruiterUserId]
    );

    const [[timeToHire]] = await db.query(
      `SELECT ROUND(AVG(DATEDIFF(a.updated_at, a.applied_at)),1) AS avg_days
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.recruiter_id = ? AND a.status = 'hired'
         AND a.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [recruiterUserId, Number(days)]
    );

    return res.json({ funnel, dailyApps, topJobs, timeToHire });
  } catch (err) {
    console.error("[recruiter/analytics]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /talent-pool ──────────────────────────────────────────
router.get("/talent-pool", async (req, res) => {
  try {
    const [saved] = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              tp.notes, tp.created_at AS saved_at
       FROM talent_pool tp
       JOIN users u ON tp.candidate_id = u.id
       WHERE tp.recruiter_user_id = ?
       ORDER BY tp.created_at DESC`,
      [req.user.id]
    );
    return res.json(saved);
  } catch (err) {
    console.error("[recruiter/talent-pool GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /talent-pool/:userId ─────────────────────────────────
router.post("/talent-pool/:userId", async (req, res) => {
  try {
    const notes = (req.body.notes || "").slice(0, 1000);
    await db.query(
      `INSERT INTO talent_pool (recruiter_user_id, candidate_id, notes)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE notes = VALUES(notes), updated_at = NOW()`,
      [req.user.id, req.params.userId, notes]
    );
    return res.json({ message: "Saved to talent pool" });
  } catch (err) {
    console.error("[recruiter/talent-pool POST]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /talent-pool/:userId ───────────────────────────────
router.delete("/talent-pool/:userId", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM talent_pool WHERE recruiter_user_id = ? AND candidate_id = ?",
      [req.user.id, req.params.userId]
    );
    return res.json({ message: "Removed from talent pool" });
  } catch (err) {
    console.error("[recruiter/talent-pool DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /messages ────────────────────────────────────────────
router.post("/messages", async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    const { recipient_id, subject, body } = parsed.data;

    const [[recipient]] = await db.query("SELECT id, name, email FROM users WHERE id = ?", [recipient_id]);
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    await db.query(
      `INSERT INTO messages (sender_id, recipient_id, subject, body, read_at)
       VALUES (?, ?, ?, ?, NULL)`,
      [req.user.id, recipient_id, subject, body]
    );

    return res.status(201).json({ message: "Message sent" });
  } catch (err) {
    console.error("[recruiter/messages POST]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /messages ─────────────────────────────────────────────
router.get("/messages", async (req, res) => {
  try {
    const [messages] = await db.query(
      `SELECT m.id, m.subject, m.body, m.read_at, m.created_at,
              u.name AS recipient_name, u.email AS recipient_email
       FROM messages m
       JOIN users u ON m.recipient_id = u.id
       WHERE m.sender_id = ?
       ORDER BY m.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(messages);
  } catch (err) {
    console.error("[recruiter/messages GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /documents — NEW — list this recruiter's verification docs ──
router.get("/documents", async (req, res) => {
  try {
    const profile = await getRecruiterProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "Recruiter profile not found" });

    const [rows] = await db.query(
      `SELECT id, document_type, original_filename AS file_name,
              uploaded_at, review_status AS status, rejection_reason
       FROM company_verification_documents
       WHERE recruiter_profile_id = ?
       ORDER BY uploaded_at DESC`,
      [profile.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[recruiter/documents GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /documents/upload — NEW ────────────────────────────────
router.post(
  "/documents/upload",
  uploadLimiter,
  upload.single("document"),
  validateUploadedFile,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const parsed = documentUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        cleanupUpload(req.file);
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const profile = await getRecruiterProfile(req.user.id);
      if (!profile) {
        cleanupUpload(req.file);
        return res.status(404).json({ message: "Recruiter profile not found" });
      }

      // Move from the shared tmp upload dir into the private
      // verification-docs dir (same pattern applications.js uses for résumés).
      const DOCS_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs");
      fs.mkdirSync(DOCS_DIR, { recursive: true });
      const destPath = path.join(DOCS_DIR, req.file.filename);
      fs.renameSync(req.file.path, destPath);

      const [result] = await db.query(
        `INSERT INTO company_verification_documents
           (recruiter_profile_id, document_type, storage_key, original_filename, review_status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [profile.id, parsed.data.document_type, req.file.filename, req.file.safeOriginalName || req.file.originalname]
      );

      // Re-open review if this recruiter had previously been rejected.
      if (profile.verification_status === "rejected") {
        await db.query(
          "UPDATE recruiter_profiles SET verification_status = 'pending' WHERE id = ?",
          [profile.id]
        );
      }

      return res.status(201).json({ message: "Document uploaded and pending review", id: result.insertId });
    } catch (err) {
      cleanupUpload(req.file);
      console.error("[recruiter/documents/upload]", err);
      return res.status(500).json({ message: "Failed to upload document" });
    }
  }
);

// ── DELETE /documents/:id — NEW ─────────────────────────────────
router.delete("/documents/:id", async (req, res) => {
  try {
    const profile = await getRecruiterProfile(req.user.id);
    if (!profile) return res.status(404).json({ message: "Recruiter profile not found" });

    const [rows] = await db.query(
      "SELECT storage_key FROM company_verification_documents WHERE id = ? AND recruiter_profile_id = ?",
      [req.params.id, profile.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Document not found" });

    await db.query(
      "DELETE FROM company_verification_documents WHERE id = ? AND recruiter_profile_id = ?",
      [req.params.id, profile.id]
    );

    const DOCS_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs");
    const filePath = path.join(DOCS_DIR, rows[0].storage_key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.json({ message: "Document removed" });
  } catch (err) {
    console.error("[recruiter/documents DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /resumes/:appId/download — NEW ──────────────────────────
router.get("/resumes/:appId/download", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.resume_storage_key, u.name AS candidate_name
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = ? AND j.recruiter_id = ?`,
      [req.params.appId, req.user.id]
    );
    if (!rows.length || !rows[0].resume_storage_key) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const RESUME_DIR = path.join(
      path.dirname(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs")),
      "resumes"
    );
    const filePath = path.join(RESUME_DIR, rows[0].resume_storage_key);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Resume file not found" });

    const ext = path.extname(rows[0].resume_storage_key);
    return res.download(filePath, `${rows[0].candidate_name.replace(/[^a-z0-9]/gi, "_")}_resume${ext}`);
  } catch (err) {
    console.error("[recruiter/resumes download]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
