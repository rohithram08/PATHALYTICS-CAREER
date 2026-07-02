// src/backend/migrations/recruiterSchema.js
//
// Recruiter/candidate ecosystem schema, layered on top of what db.js
// creates. Every statement checks for existence first — safe to run
// more than once, safe to run on a live database.
//
// This file now runs AUTOMATICALLY at the end of db.js's initSchema()
// on every server boot (it used to be a separate manual step —
// `npm run db:migrate:recruiter` — which meant a fresh deploy could
// boot successfully while candidate-profile and notification routes
// silently 500'd because nobody remembered to run it by hand). You can
// still run it standalone with that same command; it's a no-op if
// everything already exists.
//
// It intentionally opens its own connection pool rather than importing
// db.js's `db` export, to avoid a circular import (db.js imports
// initRecruiterSchema from this file).
//
// IMPORTANT — TiDB does not support TRIGGERs. Status-history writes
// happen in Express route handlers inside a transaction instead.
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
  ssl: process.env.DB_DISABLE_SSL === "true" ? undefined : { rejectUnauthorized: true },
});

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

// ── Step 1: Extend users.role (idempotent — db.js also does this) ────────
const extendUserRoleEnum = async () => {
  if (!(await tableExists("users"))) return;
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

// ── Step 2: candidate_profiles ────────────────────────────────────────────
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
      work_experience JSON NULL COMMENT 'array of {title, company, startDate, endDate, description}',
      education JSON NULL COMMENT 'array of {degree, institution, startYear, endYear}',
      projects JSON NULL COMMENT 'array of {title, description, url, techStack}',
      preferred_locations JSON NULL COMMENT 'array of preferred job location strings',
      is_visible_to_recruiters BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'lets a student opt out of recruiter search even while applying to jobs',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  // Naukri-style expansion, added after the original table shipped —
  // additive only, so existing rows just get NULL for the new fields.
  await addColumnIfMissing("candidate_profiles", "work_experience", "JSON NULL COMMENT 'array of {title, company, startDate, endDate, description}'");
  await addColumnIfMissing("candidate_profiles", "education", "JSON NULL COMMENT 'array of {degree, institution, startYear, endYear}'");
  await addColumnIfMissing("candidate_profiles", "projects", "JSON NULL COMMENT 'array of {title, description, url, techStack}'");
  await addColumnIfMissing("candidate_profiles", "preferred_locations", "JSON NULL COMMENT 'array of preferred job location strings'");
};

// ── Step 3: notification_log ─────────────────────────────────────────────
// db.js creates email_notifications (a send-queue table). notification_log
// is a separate per-user inbox/audit log — a different concept, written to
// by utils/emailService.js every time sendNotification() fires.
const createNotificationLog = async () => {
  await createTableIfMissing(
    "notification_log",
    `CREATE TABLE notification_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT NOT NULL,
      recipient_role ENUM('user','recruiter') NOT NULL,
      notification_type VARCHAR(50) NOT NULL
        COMMENT 'e.g. application_status_changed, recruiter_welcome, document_verified, otp_requested',
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
  console.log("— Recruiter/candidate schema migration starting —");

  await extendUserRoleEnum();
  await createCandidateProfiles();
  await createNotificationLog();

  console.log("— Recruiter/candidate schema migration complete —");
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
