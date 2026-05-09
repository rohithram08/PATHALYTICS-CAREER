// src/backend/routes/greenhouse-apply.js
import express from "express";
import multer from "multer";
import FormData from "form-data";

const router = express.Router();

// Resume upload — 5MB max, PDF/DOC/DOCX only
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ok = allowed.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext)
    );
    cb(ok ? null : new Error("Resume must be PDF, DOC, or DOCX"), ok);
  },
});

/**
 * POST /api/greenhouse/apply/:company/:jobId
 *
 * Proxies a job application to Greenhouse's public job board API.
 * Browser cannot call Greenhouse directly due to CORS — this server-side
 * proxy submits the multipart/form-data on behalf of the user.
 *
 * Greenhouse docs:
 *   https://developers.greenhouse.io/job-board.html#submitting-an-application
 */
router.post(
  "/apply/:company/:jobId",
  upload.single("resume"),
  async (req, res) => {
    const { company, jobId } = req.params;
    const { first_name, last_name, email, phone } = req.body || {};

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: "first_name, last_name, and email are required.",
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Resume file is required.",
      });
    }

    try {
      // Build multipart form-data payload for Greenhouse
      const form = new FormData();
      form.append("first_name", first_name);
      form.append("last_name", last_name);
      form.append("email", email);
      form.append("phone", phone || "");
      form.append("resume", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const ghUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`;

      // Node 18+ has global fetch
      const ghRes = await fetch(ghUrl, {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
      });

      const text = await ghRes.text();

      if (!ghRes.ok) {
        console.error("[Greenhouse Apply] Failed:", ghRes.status, text);
        return res.status(ghRes.status).json({
          success: false,
          error: text || "Greenhouse rejected the application.",
        });
      }

      console.log(
        `[Greenhouse Apply] ✅ ${email} applied to ${company}/${jobId}`
      );

      return res.json({
        success: true,
        message:
          "Application submitted! The employer will email you directly within a few minutes.",
      });
    } catch (err) {
      console.error("[Greenhouse Apply] Error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error.",
      });
    }
  }
);

export default router;