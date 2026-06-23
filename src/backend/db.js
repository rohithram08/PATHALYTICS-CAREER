// src/backend/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

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
  ssl: { rejectUnauthorized: true },
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

const initSchema = async () => {
  try {
    // ── users table ──────────────────────────────────────────────
    const usersExist = await tableExists("users");
    if (usersExist) {
      await addColumnIfMissing("users", "otp", "VARCHAR(255) NULL");
      await addColumnIfMissing("users", "otp_expires_at", "DATETIME NULL");
      await addColumnIfMissing("users", "avatar_url", "LONGTEXT NULL");
      await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 0");
      await addColumnIfMissing("users", "email_verify_token", "VARCHAR(255) NULL");
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
          designation VARCHAR(255) NULL,
          phone VARCHAR(30) NULL,
          linkedin_url VARCHAR(500) NULL,
          verification_status ENUM('pending','approved','rejected') DEFAULT 'pending',
          verification_notes TEXT NULL,
          doc_url LONGTEXT NULL,
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
          apply_type ENUM('internal','external') DEFAULT 'internal',
          external_url VARCHAR(1000) NULL,
          status ENUM('draft','active','paused','closed') DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_recruiter (recruiter_id),
          INDEX idx_status (status),
          FOREIGN KEY (recruiter_id) REFERENCES recruiter_profiles(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created jobs table.");
    }

    // ── pipeline_stages ──────────────────────────────────────────
    if (!(await tableExists("pipeline_stages"))) {
      await db.query(`
        CREATE TABLE pipeline_stages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          job_id INT NOT NULL,
          stage_name VARCHAR(100) NOT NULL,
          stage_type ENUM('screening','aptitude','interview','offer','custom') DEFAULT 'custom',
          stage_order INT NOT NULL,
          description TEXT NULL,
          duration_minutes INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_job (job_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created pipeline_stages table.");
    }

    // ── applications ─────────────────────────────────────────────
    if (!(await tableExists("applications"))) {
      await db.query(`
        CREATE TABLE applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          job_id INT NOT NULL,
          user_id INT NOT NULL,
          current_stage_id INT NULL,
          status ENUM('applied','in_review','shortlisted','stage_1','stage_2','stage_3',
                      'stage_4','stage_5','offer','rejected','withdrawn') DEFAULT 'applied',
          resume_url LONGTEXT NULL,
          cover_letter TEXT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_application (job_id, user_id),
          INDEX idx_job (job_id),
          INDEX idx_user (user_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created applications table.");
    }

    // ── application_stage_history ────────────────────────────────
    if (!(await tableExists("application_stage_history"))) {
      await db.query(`
        CREATE TABLE application_stage_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          application_id INT NOT NULL,
          stage_id INT NULL,
          stage_name VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          notes TEXT NULL,
          changed_by INT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_application (application_id),
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created application_stage_history table.");
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
  } catch (err) {
    console.error("❌ Database schema initialization failed:", err.message);
  }
};

initSchema();
export default db;