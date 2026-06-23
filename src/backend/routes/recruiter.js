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
      `SELECT id, company_name, company_size, industry, designation,
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

export default router;