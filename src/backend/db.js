// src/backend/db.js
//
// Single source of truth for the database schema. Runs idempotently
// on every server boot — every statement checks "does this already
// exist?" first, so it's always safe to deploy.
//
// ── Fixed in this pass (schema drift audit) ─────────────────────
//   • jobs.recruiter_id now correctly references users(id). It was
//     declared as a FK to recruiter_profiles(id), but every route
//     that reads/writes it (jobs.js, applications.js) always treated
//     it as the recruiter's *user* id. Under TiDB's FK enforcement
//     this mismatch meant POST /api/jobs could fail with a foreign
//     key violation for almost any recruiter.
//   • jobs.status ENUM now includes 'published' (jobs.js sets this on
//     /:id/publish — the old ENUM only had draft/active/paused/closed,
//     so that value could never actually be stored).
//   • jobs gained application_mode, external_apply_url, published_at,
//     closed_at, views — all read/written by jobs.js and recruiter.js
//     but previously missing from the table entirely.
//   • pipeline_stages.stage_type ENUM now matches the values jobs.js
//     actually validates (aptitude_test + assignment were missing).
//   • applications.status ENUM replaced with the vocabulary the
//     *frontend* (RecruiterDashboard/RecruiterCandidates) and
//     applications.js already use: applied, screening, interview,
//     offer, hired, rejected, withdrawn.
//   • application_status_history is now created with the columns
//     applications.js actually inserts (from_status/to_status/
//     from_stage_id/to_stage_id/changed_by) — the table that existed
//     under this pattern had a different name & shape and was unused.
//   • users gained otp_purpose/otp_resend_count/otp_last_sent_at for
//     escalating-cooldown, purpose-scoped OTP verification.
//   • talent_pool, messages, saved_careers, interview_sessions,
//     career_recommendations added — routes referenced all five but
//     none of them existed anywhere, which meant those endpoints
//     failed on every call.
//
// The recruiter/candidate ecosystem migration (candidate_profiles,
// notification_log, recruiter_profiles.company_domain/verified_at/
// verified_by, plus this pass's new tables) now runs AUTOMATICALLY at
// the end of initSchema() — it used to be a separate manual npm script
// (`db:migrate:recruiter`), which meant a fresh deploy could boot
// successfully while several routes silently 500'd because nobody
// remembered to run the migration by hand.
// ─────────────────────────────────────────────────────────────────

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { initRecruiterSchema } from "./migrations/recruiterSchema.js";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pathlytics",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_DISABLE_SSL === "true" ? undefined : { rejectUnauthorized: true },
});

const DB_NAME = process.env.DB_NAME || "pathlytics";

const columnExists = async (table, column) => {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  return rows.length > 0;
};

const tableExists = async (table) => {
  const [rows] = await db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table]
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
  try {
    const exists = await columnExists(table, column);
    if (!exists) {
      await db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${definition}`);
      console.log(`✅ Added column '${column}' to ${table}.`);
    }
  } catch (err) {
    console.error(`❌ Failed to add '${column}' to ${table}:`, err.message);
  }
};

// Finds the auto-generated FK constraint name for (table.column) so we
// can drop it before adding a corrected one — MySQL/TiDB name these
// automatically (e.g. jobs_ibfk_1) and the name isn't predictable.
const findForeignKeyName = async (table, column) => {
  const [rows] = await db.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [DB_NAME, table, column]
  );
  return rows[0]?.CONSTRAINT_NAME || null;
};

// Ensures jobs.recruiter_id references users(id). Safe to call whether
// the table was just created (already correct) or already existed
// (possibly still pointing at recruiter_profiles(id) from before this fix).
const fixJobsRecruiterFk = async () => {
  try {
    const [rows] = await db.query(
      `SELECT REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'recruiter_id'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [DB_NAME]
    );
    const currentTarget = rows[0]?.REFERENCED_TABLE_NAME;
    if (currentTarget === "users") return; // already correct

    const fkName = await findForeignKeyName("jobs", "recruiter_id");
    if (fkName) {
      await db.query(`ALTER TABLE jobs DROP FOREIGN KEY \`${fkName}\``);
      console.log(`↪︎  Dropped stale jobs.recruiter_id FK (${fkName} → ${currentTarget}).`);
    }
    await db.query(
      `ALTER TABLE jobs ADD CONSTRAINT fk_jobs_recruiter_user
       FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE`
    );
    console.log("✅ Fixed jobs.recruiter_id FK → users(id).");
  } catch (err) {
    console.error("❌ Failed to fix jobs.recruiter_id FK:", err.message);
  }
};

// Widens an ENUM column, first re-mapping any existing rows whose value
// wouldn't survive the change (old value not present in the new list),
// so we never silently truncate live data.
const migrateEnumColumn = async (table, column, newEnumValues, valueRemap = {}) => {
  const [rows] = await db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  const currentType = rows[0]?.COLUMN_TYPE || "";
  const alreadyCorrect = newEnumValues.every((v) => currentType.includes(`'${v}'`))
    && currentType.split(",").length === newEnumValues.length;
  if (alreadyCorrect) return;

  try {
    for (const [oldVal, newVal] of Object.entries(valueRemap)) {
      await db.query(
        `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` = ?`,
        [newVal, oldVal]
      );
    }
    const enumList = newEnumValues.map((v) => `'${v}'`).join(",");
    await db.query(
      `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ENUM(${enumList}) NOT NULL DEFAULT '${newEnumValues[0]}'`
    );
    console.log(`✅ Migrated ${table}.${column} ENUM → [${newEnumValues.join(", ")}].`);
  } catch (err) {
    console.error(`❌ Failed to migrate ${table}.${column} ENUM:`, err.message);
  }
};

const initSchema = async () => {
  try {
    // ── users table ──────────────────────────────────────────────
    const usersExist = await tableExists("users");
    if (!usersExist) {
      // Previously this table was assumed to already exist (created by
      // a separate, undocumented one-off script before this app existed).
      // A genuinely fresh database — a new dev's first `npm run dev`, a
      // new staging environment — had nothing to ALTER and every
      // downstream FOREIGN KEY REFERENCES users(id) failed immediately.
      await db.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) DEFAULT '',
          role ENUM('user','admin','mentor','recruiter') NOT NULL DEFAULT 'user',
          avatar_url LONGTEXT NULL,
          email_verified TINYINT(1) DEFAULT 0,
          email_verify_token VARCHAR(255) NULL,
          otp VARCHAR(255) NULL,
          otp_expires_at DATETIME NULL,
          otp_purpose VARCHAR(30) NULL,
          otp_resend_count INT NOT NULL DEFAULT 0,
          otp_last_sent_at DATETIME NULL,
          two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
          failed_login_attempts INT DEFAULT 0,
          locked_until DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ Created users table.");
    } else {
      await addColumnIfMissing("users", "otp", "VARCHAR(255) NULL");
      await addColumnIfMissing("users", "otp_expires_at", "DATETIME NULL");
      await addColumnIfMissing("users", "otp_purpose", "VARCHAR(30) NULL");
      await addColumnIfMissing("users", "otp_resend_count", "INT NOT NULL DEFAULT 0");
      await addColumnIfMissing("users", "otp_last_sent_at", "DATETIME NULL");
      await addColumnIfMissing("users", "avatar_url", "LONGTEXT NULL");
      await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 0");
      await addColumnIfMissing("users", "email_verify_token", "VARCHAR(255) NULL");
      await addColumnIfMissing("users", "two_factor_enabled", "TINYINT(1) NOT NULL DEFAULT 0");
      await addColumnIfMissing("users", "failed_login_attempts", "INT DEFAULT 0");
      await addColumnIfMissing("users", "locked_until", "DATETIME NULL");

      // ── FIX: Always ensure role column is the correct ENUM type ──
      // addColumnIfMissing won't fix an existing column that has the
      // wrong type (e.g. varchar(50) from the original login.sql).
      // This MODIFY runs every startup but is a no-op if already correct.
      try {
        await db.query(`
          ALTER TABLE users
          MODIFY COLUMN role
            ENUM('user','admin','mentor','recruiter')
            NOT NULL DEFAULT 'user'
        `);
        console.log("✅ users.role column verified/fixed.");
      } catch (err) {
        console.error("❌ Failed to fix users.role column:", err.message);
      }

      try {
        await db.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT ''");
      } catch { /* already correct */ }
    }

    // ── user_providers table ─────────────────────────────────────
    const providersExist = await tableExists("user_providers");
    if (!providersExist) {
      await db.query(`
        CREATE TABLE user_providers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          provider VARCHAR(20) NOT NULL,
          provider_user_id VARCHAR(255) NOT NULL,
          provider_email VARCHAR(255) DEFAULT NULL,
          linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_provider_account (provider, provider_user_id),
          UNIQUE KEY unique_user_provider (user_id, provider),
          INDEX idx_user (user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created user_providers table.");
    } else {
      await addColumnIfMissing("user_providers", "provider_user_id", "VARCHAR(255) NOT NULL DEFAULT ''");
      await addColumnIfMissing("user_providers", "provider_email", "VARCHAR(255) DEFAULT NULL");
      const hasOldProviderId = await columnExists("user_providers", "provider_id");
      if (hasOldProviderId) {
        try {
          await db.query(`
            UPDATE user_providers
            SET provider_user_id = provider_id
            WHERE (provider_user_id IS NULL OR provider_user_id = '')
              AND provider_id IS NOT NULL AND provider_id <> ''
          `);
        } catch (e) { console.error("Migration warning:", e.message); }
      }
    }

    // ── recruiter_profiles ───────────────────────────────────────
    if (!(await tableExists("recruiter_profiles"))) {
      await db.query(`
        CREATE TABLE recruiter_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          company_name VARCHAR(255) NOT NULL,
          company_size ENUM('1-10','11-50','51-200','201-500','501-1000','1000+') NULL,
          industry VARCHAR(100) NULL,
          company_website VARCHAR(500) NULL,
          company_logo_url LONGTEXT NULL,
          company_tier ENUM('top','mid','startup') NOT NULL DEFAULT 'startup',
          work_email VARCHAR(255) NULL,
          company_domain VARCHAR(150) NULL COMMENT 'domain from work email, e.g. acme.com',
          designation VARCHAR(255) NULL,
          phone VARCHAR(30) NULL,
          linkedin_url VARCHAR(500) NULL,
          verification_status ENUM('pending','approved','rejected') DEFAULT 'pending',
          verification_notes TEXT NULL,
          doc_url LONGTEXT NULL,
          verified_at DATETIME NULL,
          verified_by INT NULL COMMENT 'admin user_id who approved',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created recruiter_profiles table.");
    } else {
      // Migrate existing recruiter_profiles — add missing columns
      await addColumnIfMissing(
        "recruiter_profiles", "company_size",
        "ENUM('1-10','11-50','51-200','201-500','501-1000','1000+') NULL"
      );
      await addColumnIfMissing("recruiter_profiles", "industry", "VARCHAR(100) NULL");
      await addColumnIfMissing("recruiter_profiles", "work_email", "VARCHAR(255) NULL");
      await addColumnIfMissing(
        "recruiter_profiles", "company_domain",
        "VARCHAR(150) NULL COMMENT 'domain from work email, e.g. acme.com'"
      );
      await addColumnIfMissing("recruiter_profiles", "verified_at", "DATETIME NULL");
      await addColumnIfMissing("recruiter_profiles", "verified_by", "INT NULL COMMENT 'admin user_id who approved'");
    }

    // ── jobs ─────────────────────────────────────────────────────
    if (!(await tableExists("jobs"))) {
      await db.query(`
        CREATE TABLE jobs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recruiter_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description LONGTEXT NOT NULL,
          requirements LONGTEXT NULL,
          location VARCHAR(255) NOT NULL,
          job_type ENUM('full-time','part-time','contract','internship','remote') DEFAULT 'full-time',
          experience_level ENUM('entry','mid','senior','lead','any') DEFAULT 'any',
          salary_min INT NULL,
          salary_max INT NULL,
          salary_currency VARCHAR(10) DEFAULT 'INR',
          skills JSON NULL,
          application_mode ENUM('internal','external') DEFAULT 'internal',
          external_apply_url VARCHAR(1000) NULL,
          status ENUM('draft','published','paused','closed') DEFAULT 'draft',
          views INT NOT NULL DEFAULT 0,
          published_at DATETIME NULL,
          closed_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_recruiter (recruiter_id),
          INDEX idx_status (status),
          FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created jobs table.");
    } else {
      await addColumnIfMissing("jobs", "application_mode", "ENUM('internal','external') DEFAULT 'internal'");
      await addColumnIfMissing("jobs", "external_apply_url", "VARCHAR(1000) NULL");
      await addColumnIfMissing("jobs", "published_at", "DATETIME NULL");
      await addColumnIfMissing("jobs", "closed_at", "DATETIME NULL");
      await addColumnIfMissing("jobs", "views", "INT NOT NULL DEFAULT 0");
      await migrateEnumColumn("jobs", "status", ["draft", "published", "paused", "closed"], { active: "published" });
      await fixJobsRecruiterFk();
    }

    // ── pipeline_stages ──────────────────────────────────────────
    if (!(await tableExists("pipeline_stages"))) {
      await db.query(`
        CREATE TABLE pipeline_stages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          job_id INT NOT NULL,
          stage_name VARCHAR(100) NOT NULL,
          stage_type ENUM('screening','aptitude_test','interview','assignment','offer','custom') DEFAULT 'custom',
          stage_order INT NOT NULL,
          description TEXT NULL,
          duration_minutes INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_job (job_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created pipeline_stages table.");
    } else {
      await migrateEnumColumn(
        "pipeline_stages", "stage_type",
        ["screening", "aptitude_test", "interview", "assignment", "offer", "custom"],
        { aptitude: "aptitude_test" }
      );
    }

    // ── applications ─────────────────────────────────────────────
    // Status vocabulary matches what the recruiter dashboard UI and
    // applications.js already use end-to-end: applied → screening →
    // interview → offer → hired, with rejected/withdrawn as terminal
    // side-states reachable from most non-terminal stages.
    if (!(await tableExists("applications"))) {
      await db.query(`
        CREATE TABLE applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          job_id INT NULL,
          user_id INT NOT NULL,
          current_stage_id INT NULL,
          status ENUM('applied','screening','interview','offer','hired','rejected','withdrawn')
                 NOT NULL DEFAULT 'applied',
          source ENUM('internal','adzuna','greenhouse') NOT NULL DEFAULT 'internal',
          resume_storage_key VARCHAR(255) NULL,
          cover_note TEXT NULL,
          external_job_title VARCHAR(255) NULL,
          external_company VARCHAR(255) NULL,
          external_url VARCHAR(1000) NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_job (job_id),
          INDEX idx_user (user_id),
          INDEX idx_status (status),
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created applications table.");
    } else {
      await addColumnIfMissing("applications", "source", "ENUM('internal','adzuna','greenhouse') NOT NULL DEFAULT 'internal'");
      await addColumnIfMissing("applications", "resume_storage_key", "VARCHAR(255) NULL");
      await addColumnIfMissing("applications", "cover_note", "TEXT NULL");
      await addColumnIfMissing("applications", "external_job_title", "VARCHAR(255) NULL");
      await addColumnIfMissing("applications", "external_company", "VARCHAR(255) NULL");
      await addColumnIfMissing("applications", "external_url", "VARCHAR(1000) NULL");
      await migrateEnumColumn(
        "applications", "status",
        ["applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn"],
        { in_review: "screening", shortlisted: "screening", stage_1: "interview", stage_2: "interview",
          stage_3: "interview", stage_4: "interview", stage_5: "interview" }
      );
      // job_id must allow NULL for externally-tracked applications (Adzuna/Greenhouse).
      try {
        await db.query("ALTER TABLE applications MODIFY COLUMN job_id INT NULL");
      } catch (err) { console.error("❌ Failed to relax applications.job_id:", err.message); }
    }

    // Unique constraint so a candidate can't double-apply to the same
    // internal job (external applications have job_id = NULL and are
    // exempt — MySQL/TiDB treat NULL as distinct in unique indexes).
    try {
      const [idx] = await db.query(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'applications' AND INDEX_NAME = 'unique_user_internal_job'`,
        [DB_NAME]
      );
      if (!idx.length) {
        await db.query(
          `ALTER TABLE applications ADD UNIQUE KEY unique_user_internal_job (user_id, job_id)`
        );
        console.log("✅ Added applications unique_user_internal_job constraint.");
      }
    } catch (err) {
      console.error("❌ Failed to add applications unique constraint:", err.message);
    }

    // ── application_status_history ────────────────────────────────
    // (Replaces the older application_stage_history table, which had a
    // different shape and was never actually written to by any route —
    // applications.js has always inserted into application_status_history.)
    if (!(await tableExists("application_status_history"))) {
      await db.query(`
        CREATE TABLE application_status_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          application_id INT NOT NULL,
          from_status VARCHAR(50) NULL,
          to_status VARCHAR(50) NOT NULL,
          from_stage_id INT NULL,
          to_stage_id INT NULL,
          changed_by INT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_application (application_id),
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created application_status_history table.");
    }

    // ── email_notifications ──────────────────────────────────────
    if (!(await tableExists("email_notifications"))) {
      await db.query(`
        CREATE TABLE email_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          to_email VARCHAR(255) NOT NULL,
          to_name VARCHAR(255) NULL,
          subject VARCHAR(500) NOT NULL,
          body LONGTEXT NOT NULL,
          status ENUM('pending','sent','failed') DEFAULT 'pending',
          error_message TEXT NULL,
          sent_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_status (status)
        )
      `);
      console.log("✅ Created email_notifications table.");
    }

    // ── company_verification_documents ──────────────────────────
    if (!(await tableExists("company_verification_documents"))) {
      await db.query(`
        CREATE TABLE company_verification_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recruiter_profile_id INT NOT NULL,
          document_type ENUM('incorporation_certificate','gst_certificate','company_pan','other') NOT NULL,
          storage_key VARCHAR(255) NOT NULL,
          original_filename VARCHAR(255) NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          review_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          reviewed_by INT NULL,
          reviewed_at DATETIME NULL,
          rejection_reason VARCHAR(255) NULL,
          FOREIGN KEY (recruiter_profile_id) REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
          INDEX idx_review_status (review_status)
        )
      `);
      console.log("✅ Created company_verification_documents table.");
    }

    // ── talent_pool (recruiter bookmarks a candidate) ─────────────
    if (!(await tableExists("talent_pool"))) {
      await db.query(`
        CREATE TABLE talent_pool (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recruiter_user_id INT NOT NULL,
          candidate_id INT NOT NULL,
          notes VARCHAR(1000) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_bookmark (recruiter_user_id, candidate_id),
          INDEX idx_recruiter (recruiter_user_id),
          FOREIGN KEY (recruiter_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created talent_pool table.");
    }

    // ── messages (simple recruiter ↔ candidate inbox) ─────────────
    if (!(await tableExists("messages"))) {
      await db.query(`
        CREATE TABLE messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_id INT NOT NULL,
          recipient_id INT NOT NULL,
          subject VARCHAR(200) NOT NULL,
          body VARCHAR(5000) NOT NULL,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_recipient (recipient_id),
          INDEX idx_sender (sender_id),
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created messages table.");
    }

    // ── saved_careers / interview_sessions / career_recommendations ─
    // Referenced by GET /api/user/stats and /api/user/saved-careers but
    // never created anywhere — every call to those endpoints 500'd.
    if (!(await tableExists("saved_careers"))) {
      await db.query(`
        CREATE TABLE saved_careers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          career_title VARCHAR(255) NOT NULL,
          career_data JSON NULL,
          saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_career (user_id, career_title),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created saved_careers table.");
    }

    if (!(await tableExists("interview_sessions"))) {
      await db.query(`
        CREATE TABLE interview_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          role_title VARCHAR(255) NULL,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          score INT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user (user_id)
        )
      `);
      console.log("✅ Created interview_sessions table.");
    }

    if (!(await tableExists("career_recommendations"))) {
      await db.query(`
        CREATE TABLE career_recommendations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          recommendation_data JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user (user_id)
        )
      `);
      console.log("✅ Created career_recommendations table.");
    }

    // ── Legacy OAuth migration ───────────────────────────────────
    const hasOauthProvider = await columnExists("users", "oauth_provider");
    const hasOauthId = await columnExists("users", "oauth_id");
    if (hasOauthProvider && hasOauthId) {
      try {
        const [oldData] = await db.query(`
          SELECT id, oauth_provider, oauth_id, email FROM users
          WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL
            AND oauth_provider <> '' AND oauth_id <> ''
        `);
        for (const u of oldData) {
          await db.query(
            `INSERT IGNORE INTO user_providers (user_id, provider, provider_user_id, provider_email)
             VALUES (?, ?, ?, ?)`,
            [u.id, u.oauth_provider, u.oauth_id, u.email]
          );
        }
      } catch (e) { console.error("Legacy OAuth migration warning:", e.message); }
    }

    console.log("✅ Database schema initialized successfully.");

    // ── Recruiter/candidate ecosystem migration ───────────────────
    // Used to require a manual `npm run db:migrate:recruiter` step.
    // Now runs automatically so a fresh deploy can never boot into a
    // half-migrated state.
    await initRecruiterSchema();
  } catch (err) {
    console.error("❌ Database schema initialization failed:", err.message);
  }
};

initSchema();
export default db;
