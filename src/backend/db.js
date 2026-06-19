// src/backend/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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
    // ── users table columns ──────────────────────────────────────
    const usersExist = await tableExists("users");
    if (usersExist) {
      await addColumnIfMissing("users", "otp", "VARCHAR(255) NULL");
      await addColumnIfMissing("users", "otp_expires_at", "DATETIME NULL");
      await addColumnIfMissing("users", "avatar_url", "LONGTEXT NULL");
      await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 0");
      await addColumnIfMissing("users", "email_verify_token", "VARCHAR(255) NULL");
      await addColumnIfMissing("users", "failed_login_attempts", "INT DEFAULT 0");
      await addColumnIfMissing("users", "locked_until", "DATETIME NULL");

      // Ensure password is never NOT NULL (social-only users have no password)
      try {
        await db.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT ''");
      } catch { /* already correct */ }
    }

    // ── user_providers table ────────────────────────────────────
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
      // Ensure provider_user_id column exists (canonical column name)
      await addColumnIfMissing(
        "user_providers",
        "provider_user_id",
        "VARCHAR(255) NOT NULL DEFAULT ''"
      );
      await addColumnIfMissing(
        "user_providers",
        "provider_email",
        "VARCHAR(255) DEFAULT NULL"
      );

      // If old provider_id column exists, migrate its data into provider_user_id
      const hasOldProviderId = await columnExists("user_providers", "provider_id");
      if (hasOldProviderId) {
        try {
          await db.query(`
            UPDATE user_providers
            SET provider_user_id = provider_id
            WHERE (provider_user_id IS NULL OR provider_user_id = '')
              AND provider_id IS NOT NULL
              AND provider_id <> ''
          `);
          console.log("✅ Migrated provider_id → provider_user_id in user_providers.");
        } catch (e) {
          console.error("Migration warning:", e.message);
        }
      }
    }

    // ── Migrate legacy oauth_provider / oauth_id from users ────
    const hasOauthProvider = await columnExists("users", "oauth_provider");
    const hasOauthId = await columnExists("users", "oauth_id");

    if (hasOauthProvider && hasOauthId) {
      try {
        const [oldData] = await db.query(`
          SELECT id, oauth_provider, oauth_id, email
          FROM users
          WHERE oauth_provider IS NOT NULL
            AND oauth_id IS NOT NULL
            AND oauth_provider <> ''
            AND oauth_id <> ''
        `);

        for (const u of oldData) {
          await db.query(
            `INSERT IGNORE INTO user_providers
               (user_id, provider, provider_user_id, provider_email)
             VALUES (?, ?, ?, ?)`,
            [u.id, u.oauth_provider, u.oauth_id, u.email]
          );
        }

        if (oldData.length > 0) {
          console.log(`✅ Migrated ${oldData.length} legacy OAuth rows to user_providers.`);
        }
      } catch (e) {
        console.error("Legacy OAuth migration warning:", e.message);
      }
    }

    console.log("✅ Database schema initialized successfully.");
  } catch (err) {
    console.error("❌ Database schema initialization failed:", err.message);
  }
};

initSchema();

export default db;