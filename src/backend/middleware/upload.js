// src/backend/middleware/upload.js
// ─────────────────────────────────────────────────────────────
// Secure file upload middleware
//
// Security features:
//  • MIME type whitelist (checks magic bytes, NOT just extension)
//  • Max file size enforcement
//  • Filename sanitisation (strip path traversal, special chars)
//  • Stores to /tmp with uuid name, returns safe metadata
//  • Rate limit: 20 uploads / hour / user (see security.js)
// ─────────────────────────────────────────────────────────────

import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";

const TMP_DIR = process.env.UPLOAD_TMP_DIR || "/tmp/pathalytics-uploads";

// Ensure tmp dir exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// ── Allowed file types ────────────────────────────────────────
const ALLOWED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

// ── Storage: random uuid filenames in tmp ─────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${crypto.randomUUID()}${ext}`;
    cb(null, safe);
  },
});

// ── File filter (extension check — magic byte check happens after) ──
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  const allowed = Object.values(ALLOWED).flat();
  if (!allowed.includes(ext)) {
    return cb(new Error(`File type '${ext}' is not allowed`), false);
  }

  const mimeAllowed = Object.keys(ALLOWED);
  if (!mimeAllowed.includes(mime)) {
    return cb(new Error(`MIME type '${mime}' is not allowed`), false);
  }

  cb(null, true);
}

// ── Multer instance ───────────────────────────────────────────
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 3,
  },
});

// ── Magic-byte validation (runs AFTER multer saves the file) ──
export async function validateUploadedFile(req, res, next) {
  if (!req.file && !req.files) return next();

  const files = req.files
    ? Array.isArray(req.files) ? req.files : Object.values(req.files).flat()
    : [req.file];

  for (const file of files) {
    try {
      const buffer = fs.readFileSync(file.path).slice(0, 4100);
      const detected = await fileTypeFromBuffer(buffer);

      if (!detected) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: `Could not determine type of uploaded file: ${file.originalname}` });
      }

      const allowedMimes = Object.keys(ALLOWED);
      if (!allowedMimes.includes(detected.mime)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          message: `File '${file.originalname}' has an invalid type. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX`,
        });
      }

      // Attach detected type to file object
      file.detectedMime = detected.mime;
      file.safeOriginalName = sanitiseFilename(file.originalname);
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error("[upload] magic-byte validation failed", err);
      return res.status(500).json({ message: "File validation error" });
    }
  }
  next();
}

// ── Filename sanitisation ─────────────────────────────────────
function sanitiseFilename(name) {
  // Remove path traversal chars, null bytes, and unsafe chars
  return name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, "")
    .replace(/\.\./g, "")
    .slice(0, 255) || "upload";
}

// ── Cleanup helper (call after you've processed the file) ─────
export function cleanupUpload(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}