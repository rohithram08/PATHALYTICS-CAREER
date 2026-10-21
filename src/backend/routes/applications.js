// src/backend/routes/applications.js
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRole, requireVerifiedRecruiter } from "../middleware/auth.js";
import { requireWhitelistedOrigin } from "../middleware/security.js";
import { requireOwnJob } from "./jobs.js";
import { sendNotification } from "../utils/emailService.js";
import { checkStatusTransition, RECRUITER_SETTABLE_STATUSES } from "../utils/atsTransitions.js";

const router = express.Router();

// Aligned with RECRUITER_SETTABLE_STATUSES (utils/atsTransitions.js) — the
// same vocabulary the recruiter dashboard UI uses. 'withdrawn' is
// intentionally excluded here: only the candidate can withdraw their own
// application, via POST /:id/withdraw below.
const STATUS_VALUES = RECRUITER_SETTABLE_STATUSES;

// ── Resume storage (private — same pattern as recruiter verification docs) ──
const BASE_UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs");
const RESUME_DIR = path.join(path.dirname(BASE_UPLOAD_DIR), "resumes");
fs.mkdirSync(RESUME_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RESUME_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Apply to an internal (recruiter-posted) job ──────────────────────
router.post(
  "/internal",
  requireWhitelistedOrigin,
  requireAuth,
  requireRole("user"),
  upload.single("resume"),
  async (req, res) => {
    try {
      const schema = z.object({
        jobId: z.coerce.number().int().positive(),
        coverNote: z.string().max(2000).trim().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res
          .status(400)
          .json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }
      const { jobId, coverNote } = parsed.data;

      const [jobs] = await db.query(
        `SELECT j.id, j.title, j.recruiter_id, u.email AS recruiter_email
         FROM jobs j JOIN users u ON u.id = j.recruiter_id
         WHERE j.id = ? AND j.status = 'published'`,
        [jobId]
      );
      if (jobs.length === 0) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res
          .status(404)
          .json({ message: "Job not found or not currently accepting applications" });
      }
      const job = jobs[0];

      // Pre-check for a friendly message; the unique_user_internal_job
      // constraint on the applications table is the real backstop against
      // a race between two near-simultaneous requests.
      const [existing] = await db.query(
        "SELECT id FROM applications WHERE user_id = ? AND job_id = ?",
        [req.user.id, jobId]
      );
      if (existing.length > 0) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(409).json({ message: "You've already applied to this job" });
      }

      // Drop the candidate into the first stage of the recruiter's
      // pipeline by default — publishing already requires at least one
      // stage to exist, so this should always resolve.
      const [firstStage] = await db.query(
        "SELECT id FROM pipeline_stages WHERE job_id = ? ORDER BY stage_order ASC LIMIT 1",
        [jobId]
      );
      const stageId = firstStage[0]?.id ?? null;

      const [result] = await db.query(
        `INSERT INTO applications
           (user_id, job_id, source, current_stage_id, status, resume_storage_key, cover_note)
         VALUES (?, ?, 'internal', ?, 'applied', ?, ?)`,
        [req.user.id, jobId, stageId, req.file?.filename ?? null, coverNote ?? null]
      );

      await db.query(
        `INSERT INTO application_status_history (application_id, from_status, to_status, to_stage_id, changed_by)
         VALUES (?, NULL, 'applied', ?, ?)`,
        [result.insertId, stageId, req.user.id]
      );

      const [candidateRows] = await db.query("SELECT name FROM users WHERE id = ?", [req.user.id]);

      // Fire-and-forget — a slow or failed email shouldn't delay this response.
      sendNotification("application_received", {
        to: job.recruiter_email,
        userId: job.recruiter_id,
        role: "recruiter",
        applicationId: result.insertId,
        jobId,
        candidateName: candidateRows[0]?.name || "A candidate",
        jobTitle: job.title,
      });

      return res.status(201).json({ id: result.insertId, status: "applied" });
    } catch (err) {
      if (req.file) fs.unlink(req.file.path, () => {});
      console.error("[applications:apply-internal]", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// ── Track an external (Adzuna/Greenhouse) application ────────────────
// No recruiter on the platform to notify — this just replaces the
// localStorage bookmark with a real, server-side row tied to the user.
router.post("/external", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const schema = z.object({
      externalJobTitle: z.string().min(2).max(150).trim(),
      externalCompany: z.string().min(1).max(150).trim(),
      externalUrl: z.string().url().optional(),
      source: z.enum(["adzuna", "greenhouse"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    const { externalJobTitle, externalCompany, externalUrl, source } = parsed.data;

    const [result] = await db.query(
      `INSERT INTO applications (user_id, job_id, external_job_title, external_company, external_url, source, status)
       VALUES (?, NULL, ?, ?, ?, ?, 'applied')`,
      [req.user.id, externalJobTitle, externalCompany, externalUrl ?? null, source]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("[applications:apply-external]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── User: everything they've applied to, internal + external ────────
router.get("/mine", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.job_id, a.external_job_title, a.external_company, a.external_url,
              a.source, a.status, a.applied_at, a.updated_at,
              j.title AS job_title, rp.company_name,
              ps.stage_name AS current_stage_name
       FROM applications a
       LEFT JOIN jobs j ON j.id = a.job_id
       LEFT JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
       LEFT JOIN pipeline_stages ps ON ps.id = a.current_stage_id
       WHERE a.user_id = ?
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[applications:mine]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/withdraw", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.status, a.job_id, a.user_id,
              j.title AS job_title, j.recruiter_id, ru.email AS recruiter_email
       FROM applications a
       LEFT JOIN jobs j ON j.id = a.job_id
       LEFT JOIN users ru ON ru.id = j.recruiter_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Application not found" });
    const application = rows[0];
    if (application.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (application.status === "withdrawn") {
      return res.status(400).json({ message: "Already withdrawn" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("UPDATE applications SET status = 'withdrawn' WHERE id = ?", [req.params.id]);
      await conn.query(
        `INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
         VALUES (?, ?, 'withdrawn', ?)`,
        [req.params.id, application.status, req.user.id]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    if (application.job_id) {
      const [candidateRows] = await db.query("SELECT name FROM users WHERE id = ?", [req.user.id]);
      sendNotification("application_withdrawn", {
        to: application.recruiter_email,
        userId: application.recruiter_id,
        role: "recruiter",
        applicationId: application.id,
        jobId: application.job_id,
        candidateName: candidateRows[0]?.name || "A candidate",
        jobTitle: application.job_title,
      });
    }

    return res.json({ message: "Application withdrawn" });
  } catch (err) {
    console.error("[applications:withdraw]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Recruiter: view applicants for one of their own jobs ─────────────
router.get(
  "/job/:id",
  requireAuth,
  requireRole("recruiter"),
  requireOwnJob,
  requireVerifiedRecruiter,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT a.id, a.status, a.applied_at, a.updated_at, a.resume_storage_key, a.cover_note,
                u.id AS candidate_id, u.name AS candidate_name, u.email AS candidate_email,
                ps.id AS current_stage_id, ps.stage_name AS current_stage_name
         FROM applications a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN pipeline_stages ps ON ps.id = a.current_stage_id
         WHERE a.job_id = ?
         ORDER BY a.applied_at DESC`,
        [req.params.id]
      );
      return res.json(rows);
    } catch (err) {
      console.error("[applications:job-list]", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// ── Recruiter: move a candidate to a new status and/or pipeline stage ─
router.patch("/:id/status", requireAuth, requireRole("recruiter"), requireVerifiedRecruiter, async (req, res) => {
  try {
    // notes added in P1.2 consolidation — the canonical replacement for
    // the old POST /api/recruiter/candidates/:id/status endpoint's
    // notes → cover_note capability. Kept fully independent of
    // status/stageId: any one of the three alone is a valid request.
    const schema = z
      .object({
        status: z.enum(STATUS_VALUES).optional(),
        stageId: z.coerce.number().int().positive().optional(),
        notes: z.string().max(2000).optional(),
      })
      .refine((d) => d.status || d.stageId || d.notes !== undefined, {
        message: "Provide status, stageId, and/or notes",
      });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const [rows] = await db.query(
      `SELECT a.id, a.status, a.user_id, a.job_id, a.current_stage_id,
              j.title AS job_title, j.recruiter_id,
              candidate.name AS candidate_name, candidate.email AS candidate_email,
              recruiter.email AS recruiter_email
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users candidate ON candidate.id = a.user_id
       JOIN users recruiter ON recruiter.id = j.recruiter_id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Application not found" });
    const application = rows[0];
    if (application.recruiter_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let stageName = null;
    if (parsed.data.stageId) {
      const [stages] = await db.query(
        "SELECT stage_name FROM pipeline_stages WHERE id = ? AND job_id = ?",
        [parsed.data.stageId, application.job_id]
      );
      if (stages.length === 0) {
        return res.status(400).json({ message: "Stage does not belong to this job" });
      }
      stageName = stages[0].stage_name;
    }

    const newStatus = parsed.data.status ?? application.status;
    const newStageId = parsed.data.stageId ?? application.current_stage_id;
    const hasAtsChange = parsed.data.status !== undefined || parsed.data.stageId !== undefined;
    const hasNotes = parsed.data.notes !== undefined;

    if (parsed.data.status) {
      const transition = checkStatusTransition(application.status, parsed.data.status);
      if (!transition.ok) {
        return res.status(409).json({ message: transition.reason });
      }
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (hasAtsChange && hasNotes) {
        await conn.query(
          "UPDATE applications SET status = ?, current_stage_id = ?, cover_note = ? WHERE id = ?",
          [newStatus, newStageId, parsed.data.notes, req.params.id]
        );
        await conn.query(
          `INSERT INTO application_status_history
             (application_id, from_status, to_status, from_stage_id, to_stage_id, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, application.status, newStatus, application.current_stage_id, newStageId, req.user.id]
        );
      } else if (hasAtsChange) {
        await conn.query(
          "UPDATE applications SET status = ?, current_stage_id = ? WHERE id = ?",
          [newStatus, newStageId, req.params.id]
        );
        await conn.query(
          `INSERT INTO application_status_history
             (application_id, from_status, to_status, from_stage_id, to_stage_id, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, application.status, newStatus, application.current_stage_id, newStageId, req.user.id]
        );
      } else {
        // notes-only: nothing ATS-relevant changed, so no history row and
        // no "your status changed" notification below — either would be
        // misleading for a request that only updated a text note.
        await conn.query(
          "UPDATE applications SET cover_note = ? WHERE id = ?",
          [parsed.data.notes, req.params.id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    if (hasAtsChange) {
      // Both sides get notified on every real status/stage change, as
      // specified — the candidate hears their status changed, the
      // recruiter gets a confirmation of the change they just made.
      sendNotification("application_status_changed", {
        to: application.candidate_email,
        userId: application.user_id,
        role: "user",
        applicationId: application.id,
        jobId: application.job_id,
        jobTitle: application.job_title,
        status: newStatus,
        stageName,
      });
      sendNotification("application_status_update_confirmation", {
        to: application.recruiter_email,
        userId: req.user.id,
        role: "recruiter",
        applicationId: application.id,
        jobId: application.job_id,
        candidateName: application.candidate_name,
        jobTitle: application.job_title,
        status: newStatus,
        stageName,
      });
    }

    return res.json({ message: "Application updated", status: newStatus, stageName });
  } catch (err) {
    console.error("[applications:update-status]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;