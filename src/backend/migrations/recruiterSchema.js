// src/backend/migrations/recruiterSchema.js
//
// Adds the recruiter ecosystem schema on top of the existing PATHALYTICS
// database (TiDB Cloud Serverless). Every statement checks for existence
// first — safe to run more than once and safe to run on a live database.
//
// ── IMPORTANT: schema ownership ─────────────────────────────────────────
// db.js runs initSchema() on every server start and ALREADY created these
// tables with a specific shape:
//
//   recruiter_profiles  — uses verification_status ENUM('pending','approved','rejected')
//                         and company_tier ENUM('top','mid','startup')
//   jobs                — recruiter_id FK → recruiter_profiles(id), NOT users(id)
//   pipeline_stages     — stage_type ENUM includes 'aptitude' (not 'aptitude_test')
//   applications        — uses status ENUM with stage_1..stage_5 legacy values
//   application_stage_history — (not application_status_history)
//   company_verification_documents — already created by db.js
//
// This migration therefore:
//   1. Extends users.role to include 'recruiter' (idempotent ALTER)
//   2. Adds MISSING COLUMNS to recruiter_profiles that db.js didn't include
//      (company_domain, verified_at, verified_by)
//   3. Creates only the tables db.js does NOT create:
//      candidate_profiles, notification_log
//   4. Skips tables that db.js already owns.
//
// Tables that look like they need a "redesign" (jobs FK target, applications
// ENUM shape, history table name) are left as-is. Changing live table
// structure requires a separate ALTER migration with a data-safety plan.
//
// IMPORTANT — TiDB does not support TRIGGERs. Status-history writes must
// happen in Express route handlers inside a transaction.
//
// Run once, manually:
//   npm run db:migrate:recruiter
//
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const DB_NAME =
  process.env.DB_NAME ||
  process.env.TIDB_DATABASE ||
  process.env.DATABASE_NAME ||
  process.env.MYSQL_DATABASE ||
  "pathalytics";

const db = mysql.createPool({
  host:     process.env.DB_HOST     || process.env.TIDB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || process.env.TIDB_PORT || "3306", 10),
  user:     process.env.DB_USER     || process.env.TIDB_USER     || "root",
  password: process.env.DB_PASS     || process.env.DB_PASSWORD   ||
            process.env.TIDB_PASSWORD || "",
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: true },
});

console.log("◇ injected env from .env");
console.log("  → database : " + DB_NAME);
console.log("  → host     : " + (process.env.DB_HOST || process.env.TIDB_HOST || "localhost"));

// ── Helpers ──────────────────────────────────────────────────────────────
const tableExists = async (table) => {
  const [rows] = await db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table]
  );
  return rows.length > 0;
};

const columnExists = async (table, column) => {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
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
    console.error(`❌ Failed to create ${table}:`, err.message, "\n", err.sql ?? "");
    // Stop — later tables have FKs into earlier ones.
    throw err;
  }
};

const addColumnIfMissing = async (table, column, definition) => {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`↪︎  ${table}.${column} already exists, skipping.`);
    return;
  }
  try {
    // Column names that are reserved words must be backticked in ALTER TABLE too
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`✅ Added ${table}.${column}.`);
  } catch (err) {
    console.error(`❌ Failed to add ${table}.${column}:`, err.message);
    throw err;
  }
};

// ── Step 1: Extend users.role ────────────────────────────────────────────
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
      `ALTER TABLE users MODIFY COLUMN role
       ENUM('user','admin','mentor','recruiter') NOT NULL DEFAULT 'user'`
    );
    console.log("✅ Extended users.role to include 'recruiter'.");
  } catch (err) {
    console.error("❌ Failed to extend users.role:", err.message);
    throw err;
  }
};

// ── Step 2: Add missing columns to recruiter_profiles ────────────────────
// db.js created the table but omitted company_domain, verified_at,
// verified_by. These are needed by requireVerifiedRecruiter and the
// admin verification workflow.
const extendRecruiterProfiles = async () => {
  if (!(await tableExists("recruiter_profiles"))) {
    console.log("↪︎  recruiter_profiles not found — db.js hasn't run yet, skipping column extensions.");
    return;
  }

  // company_domain: extracted from work email at sign-up
  await addColumnIfMissing(
    "recruiter_profiles", "company_domain",
    "VARCHAR(150) NULL COMMENT 'domain from work email, e.g. acme.com' AFTER work_email"
  );

  // verified_at / verified_by: set by admin when approving the recruiter.
  // verified_by references users(id) — allow SET NULL if the admin is deleted.
  await addColumnIfMissing(
    "recruiter_profiles", "verified_at",
    "DATETIME NULL AFTER verification_notes"
  );
  await addColumnIfMissing(
    "recruiter_profiles", "verified_by",
    "INT NULL COMMENT 'admin user_id who approved' AFTER verified_at"
  );
};

// ── Step 3: candidate_profiles ───────────────────────────────────────────
// `current_role` IS a reserved keyword in TiDB / MySQL — it must be
// backticked everywhere: in CREATE TABLE, SELECT, INSERT, and UPDATE.
const createCandidateProfiles = async () => {
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
      \`current_role\` VARCHAR(150) NULL,
      current_company VARCHAR(150) NULL,
      expected_salary VARCHAR(50) NULL,
      notice_period VARCHAR(50) NULL,
      resume_storage_key VARCHAR(255) NULL,
      skills JSON NULL,
      is_visible_to_recruiters BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'lets a student opt out of recruiter search even while applying to jobs',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
};

// ── Step 4: notification_log ─────────────────────────────────────────────
// db.js created email_notifications (a send-queue table). notification_log
// is a separate per-user inbox/audit log — a different concept.
// NOTE: db.js jobs FK is recruiter_profiles(id), so related_job_id here
// intentionally references jobs(id) directly.
const createNotificationLog = async () => {
  await createTableIfMissing(
    "notification_log",
    `CREATE TABLE notification_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT NOT NULL,
      recipient_role ENUM('user','recruiter') NOT NULL,
      notification_type VARCHAR(50) NOT NULL
        COMMENT 'e.g. application_status_changed, recruiter_welcome, document_verified',
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
};

// ── Main ─────────────────────────────────────────────────────────────────
export const initRecruiterSchema = async () => {
  console.log("— Recruiter schema migration starting —");

  await extendUserRoleEnum();
  await extendRecruiterProfiles();
  await createCandidateProfiles();
  await createNotificationLog();

  // Tables already managed by db.js — log that we're intentionally skipping:
  for (const t of [
    "recruiter_profiles",
    "company_verification_documents",
    "jobs",
    "pipeline_stages",
    "applications",
    "application_stage_history",
    "email_notifications",
  ]) {
    if (await tableExists(t)) {
      console.log(`↪︎  ${t} owned by db.js — skipping.`);
    }
  }

  console.log("— Recruiter schema migration complete —");
};

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