// src/backend/migrations/recruiterSchema.js
//
// Adds the recruiter ecosystem schema on top of the existing PATHALYTICS
// database (TiDB Cloud Serverless). Every statement checks for existence
// first, the same pattern as the self-healing checks already in db.js —
// so this is safe to run more than once and safe to run on a live database.
//
// IMPORTANT — TiDB does not support TRIGGER, stored procedures, or
// user-defined functions (confirmed against TiDB's own MySQL-compatibility
// docs, June 2026). Anything that would normally be "auto-synced" by a
// database trigger — writing an application_status_history row when an
// application's status changes, logging a notification, recalculating an
// applicant count — has to happen in the Express route handler instead,
// wrapped in a transaction alongside the UPDATE. That logic belongs in the
// Phase 1/2 route files (recruiter.js, applications.js), not here. This
// file only creates structure, it doesn't write any "sync" logic.
//
// Run once, manually, after reading through it:
//   npm run db:migrate:recruiter
//
// Tables are created in dependency order so foreign keys always resolve:
//   users (existing)
//     -> recruiter_profiles
//          -> company_verification_documents
//     -> jobs
//          -> pipeline_stages
//     -> candidate_profiles
//     -> applications  (references users, jobs, pipeline_stages)
//          -> application_status_history
//     -> notification_log

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pathlytics",
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: true },
});

const DB_NAME = process.env.DB_NAME || "pathlytics";

// ── Helpers (deliberately self-contained, not imported from db.js, to
//    avoid a circular import between db.js and this file) ──────────────
const tableExists = async (table) => {
  const [rows] = await db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table]
  );
  return rows.length > 0;
};

const createTableIfMissing = async (table, ddl) => {
  const exists = await tableExists(table);
  if (exists) {
    console.log(`↪︎  ${table} already exists, skipping.`);
    return;
  }
  try {
    await db.query(ddl);
    console.log(`✅ Created ${table}.`);
  } catch (err) {
    console.error(`❌ Failed to create ${table}:`, err.message);
    // Stop here rather than continuing — later tables have FKs into
    // earlier ones, so pressing on after a failure just produces a
    // confusing cascade of unrelated errors.
    throw err;
  }
};

const extendUserRoleEnum = async () => {
  const [rows] = await db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
    [DB_NAME]
  );
  const currentType = rows[0]?.COLUMN_TYPE || "";
  if (currentType.includes("'recruiter'")) {
    console.log("↪︎  users.role already includes 'recruiter', skipping.");
    return;
  }
  try {
    await db.query(
      `ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','mentor','recruiter') NOT NULL DEFAULT 'user'`
    );
    console.log("✅ Extended users.role to include 'recruiter'.");
  } catch (err) {
    console.error("❌ Failed to extend users.role:", err.message);
    throw err;
  }
};

// ── Migration ────────────────────────────────────────────────────────
export const initRecruiterSchema = async () => {
  console.log("— Recruiter schema migration starting —");

  await extendUserRoleEnum();

  await createTableIfMissing(
    "recruiter_profiles",
    `CREATE TABLE recruiter_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      company_name VARCHAR(150) NOT NULL,
      company_size ENUM('1-10','11-50','51-200','201-500','501-1000','1000+') NOT NULL,
      industry VARCHAR(100) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      company_domain VARCHAR(150) NULL COMMENT 'domain extracted from the work email at signup, e.g. acme.com',
      company_tier ENUM('top','mid','low') NOT NULL DEFAULT 'low',
      verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
      verified_at DATETIME NULL,
      verified_by INT NULL COMMENT 'admin user id who approved the verification',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_tier (company_tier),
      INDEX idx_verification (verification_status)
    )`
  );

  await createTableIfMissing(
    "company_verification_documents",
    `CREATE TABLE company_verification_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recruiter_profile_id INT NOT NULL,
      document_type ENUM('incorporation_certificate','gst_certificate','company_pan','other') NOT NULL,
      storage_key VARCHAR(255) NOT NULL COMMENT 'private storage path/key — never a publicly servable URL',
      original_filename VARCHAR(255) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      review_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL,
      rejection_reason VARCHAR(255) NULL,
      FOREIGN KEY (recruiter_profile_id) REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_review_status (review_status)
    )`
  );

  await createTableIfMissing(
    "jobs",
    `CREATE TABLE jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recruiter_id INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      location VARCHAR(150) NOT NULL,
      job_type ENUM('full-time','part-time','internship','contract') NOT NULL DEFAULT 'full-time',
      salary_min INT NULL,
      salary_max INT NULL,
      application_mode ENUM('internal','external') NOT NULL DEFAULT 'internal' COMMENT 'internal = Easy Apply on-platform, external = redirect to recruiter ATS/site',
      external_apply_url VARCHAR(500) NULL,
      status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft',
      published_at DATETIME NULL,
      closed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_status (status),
      INDEX idx_recruiter (recruiter_id)
    )`
  );

  await createTableIfMissing(
    "pipeline_stages",
    `CREATE TABLE pipeline_stages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_id INT NOT NULL,
      stage_order INT NOT NULL COMMENT 'recruiter-defined sequence position — no fixed stage count anywhere',
      stage_name VARCHAR(100) NOT NULL COMMENT 'recruiter''s own label, e.g. Resume screening, Technical interview',
      stage_type ENUM('screening','aptitude_test','interview','assignment','offer','custom') NOT NULL DEFAULT 'custom',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE KEY unique_job_stage_order (job_id, stage_order)
    )`
  );

  await createTableIfMissing(
    "candidate_profiles",
    `CREATE TABLE candidate_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      full_name VARCHAR(150) NULL,
      phone VARCHAR(20) NULL,
      location VARCHAR(150) NULL,
      linkedin_url VARCHAR(255) NULL,
      github_url VARCHAR(255) NULL,
      portfolio_url VARCHAR(255) NULL,
      years_of_experience VARCHAR(20) NULL,
      current_role VARCHAR(150) NULL,
      current_company VARCHAR(150) NULL,
      expected_salary VARCHAR(50) NULL,
      notice_period VARCHAR(50) NULL,
      resume_storage_key VARCHAR(255) NULL,
      skills JSON NULL,
      is_visible_to_recruiters BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'lets a student opt out of recruiter search even while applying to jobs',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await createTableIfMissing(
    "applications",
    `CREATE TABLE applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_id INT NULL COMMENT 'NULL for external (Adzuna/Greenhouse) applications the user is tracking for their own convenience',
      external_job_title VARCHAR(150) NULL,
      external_company VARCHAR(150) NULL,
      external_url VARCHAR(500) NULL,
      source ENUM('internal','adzuna','greenhouse') NOT NULL,
      current_stage_id INT NULL,
      status ENUM('applied','in-review','interview','offer','rejected','withdrawn') NOT NULL DEFAULT 'applied',
      resume_storage_key VARCHAR(255) NULL,
      cover_note TEXT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL,
      UNIQUE KEY unique_user_internal_job (user_id, job_id),
      INDEX idx_job_status (job_id, status),
      INDEX idx_user (user_id)
    )`
  );

  await createTableIfMissing(
    "application_status_history",
    `CREATE TABLE application_status_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL,
      from_status VARCHAR(50) NULL,
      to_status VARCHAR(50) NOT NULL,
      from_stage_id INT NULL,
      to_stage_id INT NULL,
      changed_by INT NOT NULL COMMENT 'recruiter user id who made the change',
      note VARCHAR(255) NULL,
      changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_application (application_id)
    )`
  );

  await createTableIfMissing(
    "notification_log",
    `CREATE TABLE notification_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT NOT NULL,
      recipient_role ENUM('user','recruiter') NOT NULL,
      notification_type VARCHAR(50) NOT NULL COMMENT 'e.g. application_status_changed, recruiter_welcome, document_verified',
      related_application_id INT NULL,
      related_job_id INT NULL,
      subject VARCHAR(255) NOT NULL,
      status ENUM('sent','failed') NOT NULL DEFAULT 'sent',
      error_message VARCHAR(255) NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_application_id) REFERENCES applications(id) ON DELETE SET NULL,
      FOREIGN KEY (related_job_id) REFERENCES jobs(id) ON DELETE SET NULL,
      INDEX idx_recipient (recipient_user_id)
    )`
  );

  console.log("— Recruiter schema migration complete —");
};

// Allow running directly: node src/backend/migrations/recruiterSchema.js
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  initRecruiterSchema()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}