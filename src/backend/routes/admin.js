// src/backend/routes/admin.js
//
// Admin-only endpoints. Every route is gated by requireRole("admin").
// Admins are set by updating users.role directly in the database —
// there is intentionally no self-service way to become an admin.

import express from "express";
import path from "path";
import fs from "fs";
import { z } from "zod";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendNotification } from "../utils/emailService.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// ── List all pending verification documents ──────────────────
router.get("/verifications", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         d.id, d.document_type, d.original_filename,
         d.review_status, d.uploaded_at, d.rejection_reason,
         rp.company_name, rp.company_tier,
         u.id AS recruiter_user_id, u.name AS recruiter_name, u.email AS recruiter_email
       FROM company_verification_documents d
       JOIN recruiter_profiles rp ON rp.id = d.recruiter_profile_id
       JOIN users u ON u.id = rp.user_id
       WHERE d.review_status = 'pending'
       ORDER BY d.uploaded_at ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("[admin:verifications]", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ── Approve or reject a document ────────────────────────────
const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(255).trim().optional(),
});

router.patch("/verifications/:documentId", async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { action, rejectionReason } = parsed.data;

    if (action === "reject" && !rejectionReason?.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Fetch the document + recruiter info so we can update the profile
    // and send the notification email in one go.
    const [rows] = await db.query(
      `SELECT d.id, d.recruiter_profile_id,
              rp.user_id AS recruiter_user_id,
              u.email AS recruiter_email, u.name AS recruiter_name,
              rp.company_name
       FROM company_verification_documents d
       JOIN recruiter_profiles rp ON rp.id = d.recruiter_profile_id
       JOIN users u ON u.id = rp.user_id
       WHERE d.id = ?`,
      [req.params.documentId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }
    const doc = rows[0];

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Update the document row
      await conn.query(
        `UPDATE company_verification_documents
         SET review_status = ?, reviewed_by = ?, reviewed_at = NOW(),
             rejection_reason = ?
         WHERE id = ?`,
        [
          action === "approve" ? "approved" : "rejected",
          req.user.id,
          rejectionReason ?? null,
          doc.id,
        ]
      );

      // 2. If approved — check whether ALL documents for this recruiter
      //    are now approved, and if so, mark the recruiter as verified.
      if (action === "approve") {
        const [pending] = await conn.query(
          `SELECT COUNT(*) AS cnt FROM company_verification_documents
           WHERE recruiter_profile_id = ? AND review_status = 'pending'`,
          [doc.recruiter_profile_id]
        );
        if (pending[0].cnt === 0) {
          await conn.query(
            `UPDATE recruiter_profiles
             SET verification_status = 'approved', verified_at = NOW(), verified_by = ?
             WHERE id = ?`,
            [req.user.id, doc.recruiter_profile_id]
          );
        }
      }

      // 3. If rejected — mark the whole recruiter profile as rejected too.
      if (action === "reject") {
        await conn.query(
          `UPDATE recruiter_profiles SET verification_status = 'rejected' WHERE id = ?`,
          [doc.recruiter_profile_id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // 4. Notify the recruiter — fire-and-forget
    sendNotification(
      action === "approve" ? "recruiter_verified" : "recruiter_rejected",
      {
        to: doc.recruiter_email,
        userId: doc.recruiter_user_id,
        role: "recruiter",
        name: doc.recruiter_name,
        companyName: doc.company_name,
        rejectionReason: rejectionReason ?? null,
      }
    );

    return res.json({ message: `Document ${action}d` });
  } catch (err) {
    console.error("[admin:review-document]", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// ── Admin document download ───────────────────────────────────
router.get("/documents/:documentId/download", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT storage_key, original_filename FROM company_verification_documents WHERE id = ?",
      [req.params.documentId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Document not found" });

    const UPLOAD_DIR = process.env.UPLOAD_DIR
      || path.join(process.cwd(), "uploads", "verification-docs");
    const filePath = path.join(UPLOAD_DIR, rows[0].storage_key);
    return res.download(filePath, rows[0].original_filename);
  } catch (err) {
    console.error("[admin:doc-download]", err);
    return res.status(500).json({ message: "Server error" });
  }
});


export default router;