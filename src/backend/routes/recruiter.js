// src/backend/routes/recruiter.js
// ─────────────────────────────────────────────────────────────
// Recruiter dashboard API
//
// All routes require: requireAuth + requireRecruiter
//
// Endpoints:
//   GET  /api/recruiter/dashboard     — KPI snapshot
//   GET  /api/recruiter/profile       — recruiter profile
//   PUT  /api/recruiter/profile       — update profile
//   GET  /api/recruiter/jobs          — list job postings
//   POST /api/recruiter/jobs          — create job posting
//   PUT  /api/recruiter/jobs/:id      — update posting
//   DELETE /api/recruiter/jobs/:id    — delete posting
//   GET  /api/recruiter/candidates    — candidate pool (with filters)
//   GET  /api/recruiter/candidates/:id — candidate detail
//   POST /api/recruiter/candidates/:id/status — update pipeline stage
//   GET  /api/recruiter/analytics     — funnel + trend data
//   GET  /api/recruiter/messages      — inbox
//   POST /api/recruiter/messages      — send message to candidate
//   GET  /api/recruiter/talent-pool   — saved/bookmarked profiles
//   POST /api/recruiter/talent-pool/:userId — bookmark user
//   DELETE /api/recruiter/talent-pool/:userId — remove bookmark
// ─────────────────────────────────────────────────────────────

import express from "express";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRecruiter } from "../middleware/auth.js";
import { upload, validateUploadedFile, cleanupUpload } from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/security.js";

const router = express.Router();
router.use(requireAuth, requireRecruiter);

// ── Schemas ───────────────────────────────────────────────────
const jobSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(10000),
  location: z.string().max(200).optional(),
  salary_min: z.number().int().positive().optional(),
  salary_max: z.number().int().positive().optional(),
  employment_type: z.enum(["full-time", "part-time", "contract", "internship", "remote"]).optional(),
  experience_level: z.enum(["entry", "mid", "senior", "lead", "director"]).optional(),
  skills: z.array(z.string().max(60)).max(20).optional(),
  deadline: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
});

const candidateStatusSchema = z.object({
  stage: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]),
  notes: z.string().max(2000).optional(),
});

const messageSchema = z.object({
  recipient_id: z.number().int().positive(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

// ── Helpers ───────────────────────────────────────────────────
async function getRecruiterProfile(userId) {
  const [rows] = await db.query(
    "SELECT * FROM recruiter_profiles WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
}

// ── GET /dashboard ────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.user.id;

    const [[profileRow]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [userId]
    );
    if (!profileRow) {
      return res.status(404).json({ message: "Recruiter profile not found" });
    }
    const recruiterId = profileRow.id;

    const [[jobStats]] = await db.query(
      `SELECT
         COUNT(*) AS total_jobs,
         SUM(is_active = 1) AS active_jobs,
         SUM(is_active = 0) AS closed_jobs
       FROM job_postings WHERE recruiter_id = ?`,
      [recruiterId]
    );

    const [[appStats]] = await db.query(
      `SELECT
         COUNT(*) AS total_applications,
         SUM(stage = 'screening') AS screening,
         SUM(stage = 'interview') AS interviews,
         SUM(stage = 'offer') AS offers,
         SUM(stage = 'hired') AS hired,
         SUM(stage = 'rejected') AS rejected
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ?`,
      [recruiterId]
    );

    const [[viewStats]] = await db.query(
      `SELECT COALESCE(SUM(views),0) AS total_views
       FROM job_postings WHERE recruiter_id = ?`,
      [recruiterId]
    );

    // 30-day trend
    const [trend] = await db.query(
      `SELECT DATE(a.created_at) AS day, COUNT(*) AS count
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ? AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(a.created_at)
       ORDER BY day ASC`,
      [recruiterId]
    );

    // Recent applications
    const [recent] = await db.query(
      `SELECT a.id, a.stage, a.created_at,
              u.name AS candidate_name, u.email AS candidate_email,
              jp.title AS job_title
       FROM applications a
       JOIN users u ON a.user_id = u.id
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ?
       ORDER BY a.created_at DESC LIMIT 10`,
      [recruiterId]
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

// ── GET /jobs ─────────────────────────────────────────────────
router.get("/jobs", async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    let where = "WHERE jp.recruiter_id = ?";
    const params = [recruiterId];

    if (active === "true") { where += " AND jp.is_active = 1"; }
    else if (active === "false") { where += " AND jp.is_active = 0"; }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM job_postings jp ${where}`,
      params
    );

    const [jobs] = await db.query(
      `SELECT jp.*,
              COUNT(DISTINCT a.id) AS application_count,
              COUNT(DISTINCT CASE WHEN a.stage = 'hired' THEN a.id END) AS hired_count
       FROM job_postings jp
       LEFT JOIN applications a ON a.job_id = jp.id
       ${where}
       GROUP BY jp.id
       ORDER BY jp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return res.json({ jobs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[recruiter/jobs GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /jobs ────────────────────────────────────────────────
router.post("/jobs", async (req, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    const data = parsed.data;
    const [result] = await db.query(
      `INSERT INTO job_postings
         (recruiter_id, title, description, location, salary_min, salary_max,
          employment_type, experience_level, skills, deadline, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recruiterId, data.title, data.description, data.location || null,
        data.salary_min || null, data.salary_max || null,
        data.employment_type || null, data.experience_level || null,
        JSON.stringify(data.skills || []),
        data.deadline || null, data.is_active,
      ]
    );

    return res.status(201).json({ message: "Job posted", id: result.insertId });
  } catch (err) {
    console.error("[recruiter/jobs POST]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /jobs/:id ─────────────────────────────────────────────
router.put("/jobs/:id", async (req, res) => {
  try {
    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    const [existing] = await db.query(
      "SELECT id FROM job_postings WHERE id = ? AND recruiter_id = ?",
      [req.params.id, recruiterId]
    );
    if (!existing.length) return res.status(404).json({ message: "Job not found" });

    const parsed = jobSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    await db.query(
      "UPDATE job_postings SET ? WHERE id = ?",
      [{ ...parsed.data, updated_at: new Date() }, req.params.id]
    );

    return res.json({ message: "Job updated" });
  } catch (err) {
    console.error("[recruiter/jobs PUT]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /jobs/:id ──────────────────────────────────────────
router.delete("/jobs/:id", async (req, res) => {
  try {
    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    const [result] = await db.query(
      "DELETE FROM job_postings WHERE id = ? AND recruiter_id = ?",
      [req.params.id, recruiterId]
    );

    if (!result.affectedRows) return res.status(404).json({ message: "Job not found" });
    return res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("[recruiter/jobs DELETE]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /candidates ───────────────────────────────────────────
router.get("/candidates", async (req, res) => {
  try {
    const { job_id, stage, q, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    let where = "WHERE jp.recruiter_id = ?";
    const params = [recruiterId];

    if (job_id) { where += " AND a.job_id = ?"; params.push(job_id); }
    if (stage)  { where += " AND a.stage = ?";  params.push(stage); }
    if (q) {
      where += " AND (u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN users u ON a.user_id = u.id
       ${where}`,
      params
    );

    const [candidates] = await db.query(
      `SELECT a.id AS application_id, a.stage, a.notes, a.created_at AS applied_at,
              u.id AS user_id, u.name, u.email, u.avatar_url,
              jp.id AS job_id, jp.title AS job_title
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return res.json({ candidates, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[recruiter/candidates GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── GET /candidates/:id ───────────────────────────────────────
router.get("/candidates/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id AS application_id, a.stage, a.notes, a.created_at AS applied_at,
              a.resume_url, a.cover_letter,
              u.id AS user_id, u.name, u.email, u.avatar_url,
              jp.id AS job_id, jp.title AS job_title
       FROM applications a
       JOIN users u ON a.user_id = u.id
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN recruiter_profiles rp ON jp.recruiter_id = rp.id
       WHERE a.id = ? AND rp.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Application not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[recruiter/candidates/:id GET]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── POST /candidates/:id/status ───────────────────────────────
router.post("/candidates/:id/status", async (req, res) => {
  try {
    const parsed = candidateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    // Verify ownership
    const [check] = await db.query(
      `SELECT a.id FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       JOIN recruiter_profiles rp ON jp.recruiter_id = rp.id
       WHERE a.id = ? AND rp.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!check.length) return res.status(404).json({ message: "Application not found" });

    await db.query(
      "UPDATE applications SET stage = ?, notes = ?, updated_at = NOW() WHERE id = ?",
      [parsed.data.stage, parsed.data.notes || null, req.params.id]
    );

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
    const [[{ id: recruiterId }]] = await db.query(
      "SELECT id FROM recruiter_profiles WHERE user_id = ?",
      [req.user.id]
    );

    // Application funnel
    const [funnel] = await db.query(
      `SELECT stage, COUNT(*) AS count
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ?
       GROUP BY stage`,
      [recruiterId]
    );

    // Daily applications trend
    const [dailyApps] = await db.query(
      `SELECT DATE(a.created_at) AS date, COUNT(*) AS count
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ?
         AND a.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(a.created_at)
       ORDER BY date`,
      [recruiterId, Number(days)]
    );

    // Top performing jobs
    const [topJobs] = await db.query(
      `SELECT jp.title, jp.id,
              COUNT(DISTINCT a.id) AS applications,
              jp.views
       FROM job_postings jp
       LEFT JOIN applications a ON a.job_id = jp.id
       WHERE jp.recruiter_id = ?
       GROUP BY jp.id
       ORDER BY applications DESC LIMIT 5`,
      [recruiterId]
    );

    // Time-to-hire (avg days from applied to hired)
    const [[timeToHire]] = await db.query(
      `SELECT ROUND(AVG(DATEDIFF(a.updated_at, a.created_at)),1) AS avg_days
       FROM applications a
       JOIN job_postings jp ON a.job_id = jp.id
       WHERE jp.recruiter_id = ? AND a.stage = 'hired'
         AND a.updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [recruiterId, Number(days)]
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

    // Verify recipient exists
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

export default router;