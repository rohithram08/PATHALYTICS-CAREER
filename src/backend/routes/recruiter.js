// src/backend/routes/recruiter.js
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Every route below requires a logged-in recruiter.
router.use(requireAuth, requireRole("recruiter"));

// ── Document storage ────────────────────────────────────────────────
// Private directory, never served via express.static. Files are only
// ever reachable through the authenticated /documents/:id/download
// route below, which checks ownership before reading anything off disk.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      // Random name on disk, not the original filename — an enumerated
      // or guessed path is useless without a matching DB row to authorize it.
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Profile ──────────────────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, company_name, company_size, industry, designation, company_domain,
              company_tier, verification_status, created_at
       FROM recruiter_profiles WHERE user_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Recruiter profile not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error("[recruiter:get-profile]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const profileUpdateSchema = z.object({
  companyName: z.string().min(2).max(150).trim().optional(),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]).optional(),
  industry: z.string().min(2).max(100).trim().optional(),
  designation: z.string().min(2).max(100).trim().optional(),
});

router.patch("/profile", async (req, res) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
    }

    // company_tier and verification_status are deliberately not editable
    // here — those are system/admin controlled, not self-service fields.
    const columns = {
      companyName: "company_name",
      companySize: "company_size",
      industry: "industry",
      designation: "designation",
    };
    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(columns)) {
      if (parsed.data[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(parsed.data[key]);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    values.push(req.user.id);

    await db.query(`UPDATE recruiter_profiles SET ${sets.join(", ")} WHERE user_id = ?`, values);
    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("[recruiter:update-profile]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Verification documents (low-tier / no corporate domain) ─────────
router.post("/documents", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded, or file type not allowed (PDF/JPEG/PNG only)" });
    }

    const documentType = z
      .enum(["incorporation_certificate", "gst_certificate", "company_pan", "other"])
      .safeParse(req.body.documentType);
    if (!documentType.success) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Invalid document type" });
    }

    const [profile] = await db.query("SELECT id FROM recruiter_profiles WHERE user_id = ?", [
      req.user.id,
    ]);
    if (profile.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Recruiter profile not found" });
    }

    await db.query(
      `INSERT INTO company_verification_documents
         (recruiter_profile_id, document_type, storage_key, original_filename)
       VALUES (?, ?, ?, ?)`,
      [profile[0].id, documentType.data, req.file.filename, req.file.originalname]
    );

    return res.status(201).json({ message: "Document uploaded, pending review" });
  } catch (err) {
    console.error("[recruiter:upload-document]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.document_type, d.original_filename, d.review_status,
              d.rejection_reason, d.uploaded_at, d.reviewed_at
       FROM company_verification_documents d
       JOIN recruiter_profiles rp ON rp.id = d.recruiter_profile_id
       WHERE rp.user_id = ?
       ORDER BY d.uploaded_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[recruiter:list-documents]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Authenticated download — ownership is checked against the logged-in
// recruiter before the file is read off disk. This replaces the "wire up
// static serving" step from the original plan, which would have made
// every uploaded document guessable/enumerable by anyone.
router.get("/documents/:id/download", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.storage_key, d.original_filename
       FROM company_verification_documents d
       JOIN recruiter_profiles rp ON rp.id = d.recruiter_profile_id
       WHERE d.id = ? AND rp.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }
    const filePath = path.join(UPLOAD_DIR, rows[0].storage_key);
    return res.download(filePath, rows[0].original_filename);
  } catch (err) {
    console.error("[recruiter:download-document]", err);
    return res.status(500).json({ message: "Server error" });
  }
});



// ── Resume download (recruiter downloads a candidate's resume) ─
// Ownership check: the application must belong to a job owned by
// this recruiter. The file is served from the private uploads dir
// — never a public static path.
router.get("/resumes/:applicationId/download", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.resume_storage_key, u.name AS candidate_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = ? AND j.recruiter_id = ?`,
      [req.params.applicationId, req.user.id]
    );
    if (rows.length === 0 || !rows[0].resume_storage_key) {
      return res.status(404).json({ message: "Resume not found" });
    }
    const RESUME_DIR = path.join(
      path.dirname(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "verification-docs")),
      "resumes"
    );
    const filePath = path.join(RESUME_DIR, rows[0].resume_storage_key);
    const safeName = `${rows[0].candidate_name.replace(/[^a-zA-Z0-9]/g, "_")}_resume.pdf`;
    return res.download(filePath, safeName);
  } catch (err) {
    console.error("[recruiter:resume-download]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Candidate discovery & matching ──────────────────────────
// Only students who opted in (is_visible_to_recruiters = true)
// are surfaced here. Recruiters see no PII beyond name, skills,
// and public profile fields — no email until an application exists.

router.get("/candidates", async (req, res) => {
  try {
    const search = req.query.search?.toString().trim() ?? "";
    const skill  = req.query.skill?.toString().trim() ?? "";

    const conditions = ["cp.is_visible_to_recruiters = TRUE"];
    const params = [];

    if (search) {
      conditions.push("(u.name LIKE ? OR cp.current_role LIKE ? OR cp.location LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (skill) {
      // JSON_SEARCH works on TiDB — returns non-null when the skill exists
      conditions.push("JSON_SEARCH(cp.skills, 'one', ?) IS NOT NULL");
      params.push(skill);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT u.id, u.name,
              cp.location, cp.current_role, cp.current_company,
              cp.years_of_experience, cp.skills, cp.linkedin_url,
              cp.github_url, cp.portfolio_url, cp.notice_period,
              cp.expected_salary
       FROM candidate_profiles cp
       JOIN users u ON u.id = cp.user_id
       ${where}
       ORDER BY u.name ASC
       LIMIT 100`,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.error("[recruiter:candidates]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Match candidates against a specific published job.
// Scoring is keyword-based: each skill in candidate_profiles.skills
// that appears in the job description adds 1 point. Simple,
// deterministic, and explainable — no black-box ML needed on day one.
router.get("/candidates/match/:jobId", async (req, res) => {
  try {
    // Ownership check — recruiter can only match against their own jobs
    const [jobs] = await db.query(
      "SELECT id, title, description FROM jobs WHERE id = ? AND recruiter_id = ? AND status = 'published'",
      [req.params.jobId, req.user.id]
    );
    if (jobs.length === 0) {
      return res.status(404).json({ message: "Job not found or not published" });
    }
    const jobDesc = jobs[0].description.toLowerCase();

    const [candidates] = await db.query(
      `SELECT u.id, u.name,
              cp.location, cp.current_role, cp.current_company,
              cp.years_of_experience, cp.skills, cp.linkedin_url,
              cp.github_url, cp.portfolio_url, cp.notice_period,
              cp.expected_salary
       FROM candidate_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.is_visible_to_recruiters = TRUE
       LIMIT 200`
    );

    const scored = candidates
      .map((c) => {
        const skills = Array.isArray(c.skills)
          ? c.skills
          : (() => { try { return JSON.parse(c.skills || "[]"); } catch { return []; } })();

        const matchedSkills = skills.filter((s) =>
          jobDesc.includes(s.toLowerCase())
        );
        return { ...c, skills, matchedSkills, score: matchedSkills.length };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    return res.json({ job: jobs[0], candidates: scored });
  } catch (err) {
    console.error("[recruiter:candidates-match]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;