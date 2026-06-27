// src/backend/routes/jobs.js
import express from "express";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRole, requireVerifiedRecruiter } from "../middleware/auth.js";

const router = express.Router();

// ── Validation ─────────────────────────────────────────────────────
const jobSchema = z
  .object({
    title: z.string().min(3).max(150).trim(),
    description: z.string().min(20).trim(),
    location: z.string().min(2).max(150).trim(),
    jobType: z.enum(["full-time", "part-time", "internship", "contract"]).default("full-time"),
    salaryMin: z.number().int().positive().optional(),
    salaryMax: z.number().int().positive().optional(),
    applicationMode: z.enum(["internal", "external"]).default("internal"),
    externalApplyUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.applicationMode === "external" && !data.externalApplyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalApplyUrl"],
        message: "External apply URL is required when application mode is external",
      });
    }
  });

const stageSchema = z.object({
  stageName: z.string().min(2).max(100).trim(),
  stageType: z
    .enum(["screening", "aptitude_test", "interview", "assignment", "offer", "custom"])
    .default("custom"),
});
// 1–20 stages, recruiter's choice — the count is never fixed in code.
const stagesSchema = z.array(stageSchema).min(1).max(20);

// ── Ownership check, reused across the recruiter-only routes below ──
export const requireOwnJob = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM jobs WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Job not found" });
    if (rows[0].recruiter_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.job = rows[0];
    next();
  } catch (err) {
    console.error("[jobs:ownership-check]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── Recruiter-side: create & manage own jobs ─────────────────────────
// Creating a draft does NOT require verification — a recruiter shouldn't
// be locked out of the platform while their documents are under review.
// Verification is enforced at /publish instead, the point where a job
// actually becomes visible to candidates.
router.post("/", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    const {
      title, description, location, jobType,
      salaryMin, salaryMax, applicationMode, externalApplyUrl,
    } = parsed.data;

    const [result] = await db.query(
      `INSERT INTO jobs
         (recruiter_id, title, description, location, job_type, salary_min, salary_max, application_mode, external_apply_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        req.user.id, title, description, location, jobType,
        salaryMin ?? null, salaryMax ?? null, applicationMode, externalApplyUrl ?? null,
      ]
    );

    return res.status(201).json({ id: result.insertId, status: "draft" });
  } catch (err) {
    console.error("[jobs:create]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/mine", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
       FROM jobs j
       WHERE j.recruiter_id = ?
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[jobs:mine]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id", requireAuth, requireRole("recruiter"), requireOwnJob, async (req, res) => {
  try {
    const parsed = jobSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }
    const columnMap = {
      title: "title",
      description: "description",
      location: "location",
      jobType: "job_type",
      salaryMin: "salary_min",
      salaryMax: "salary_max",
      applicationMode: "application_mode",
      externalApplyUrl: "external_apply_url",
    };
    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(columnMap)) {
      if (parsed.data[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(parsed.data[key]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ message: "No fields to update" });
    values.push(req.params.id);

    await db.query(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`, values);
    return res.json({ message: "Job updated" });
  } catch (err) {
    console.error("[jobs:update]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// The fraud-control checkpoint — only a verified recruiter can make a
// job actually visible to candidates.
router.patch(
  "/:id/publish",
  requireAuth,
  requireRole("recruiter"),
  requireVerifiedRecruiter,
  requireOwnJob,
  async (req, res) => {
    try {
      const [stages] = await db.query("SELECT id FROM pipeline_stages WHERE job_id = ?", [
        req.params.id,
      ]);
      if (stages.length === 0) {
        return res
          .status(400)
          .json({ message: "Add at least one pipeline stage before publishing" });
      }
      await db.query(
        "UPDATE jobs SET status = 'published', published_at = NOW() WHERE id = ?",
        [req.params.id]
      );
      return res.json({ message: "Job published" });
    } catch (err) {
      console.error("[jobs:publish]", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

router.patch(
  "/:id/close",
  requireAuth,
  requireRole("recruiter"),
  requireOwnJob,
  async (req, res) => {
    try {
      await db.query("UPDATE jobs SET status = 'closed', closed_at = NOW() WHERE id = ?", [
        req.params.id,
      ]);
      return res.json({ message: "Job closed" });
    } catch (err) {
      console.error("[jobs:close]", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// ── Pipeline stages — recruiter defines exactly as many as they want ─
router.get(
  "/:id/stages",
  requireAuth,
  requireRole("recruiter"),
  requireOwnJob,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT id, stage_order, stage_name, stage_type FROM pipeline_stages WHERE job_id = ? ORDER BY stage_order",
        [req.params.id]
      );
      return res.json(rows);
    } catch (err) {
      console.error("[jobs:get-stages]", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Replaces the full stage list in one transaction. The recruiter sends
// however many stages they want, in order — the count and the names
// aren't fixed anywhere in this file.
router.put(
  "/:id/stages",
  requireAuth,
  requireRole("recruiter"),
  requireOwnJob,
  async (req, res) => {
    const parsed = stagesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM pipeline_stages WHERE job_id = ?", [req.params.id]);

      let order = 1;
      for (const stage of parsed.data) {
        await conn.query(
          "INSERT INTO pipeline_stages (job_id, stage_order, stage_name, stage_type) VALUES (?, ?, ?, ?)",
          [req.params.id, order++, stage.stageName, stage.stageType]
        );
      }

      await conn.commit();
      return res.json({ message: `${parsed.data.length} stage(s) saved` });
    } catch (err) {
      await conn.rollback();
      console.error("[jobs:set-stages]", err);
      return res.status(500).json({ message: "Server error" });
    } finally {
      conn.release();
    }
  }
);

// ── Recruiter: fetch a single job for editing ───────────────────────
router.get(
  "/:id",
  requireAuth,
  requireRole("recruiter"),
  requireOwnJob,
  (req, res) => res.json(req.job)   // requireOwnJob already attached the row
);

// ── Public / user-facing: published internal jobs ────────────────────
// This is what JobListings.tsx merges with its Adzuna/Greenhouse results.
// No auth required — matches how the external listings are fetched today.
router.get("/internal", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.id, j.title, j.description, j.location, j.job_type, j.salary_min, j.salary_max,
              j.application_mode, j.external_apply_url, j.published_at,
              rp.company_name, rp.company_tier
       FROM jobs j
       JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
       WHERE j.status = 'published'
       ORDER BY j.published_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("[jobs:internal-list]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/internal/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT j.*, rp.company_name, rp.company_tier
       FROM jobs j
       JOIN recruiter_profiles rp ON rp.user_id = j.recruiter_id
       WHERE j.id = ? AND j.status = 'published'`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Job not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[jobs:internal-detail]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;