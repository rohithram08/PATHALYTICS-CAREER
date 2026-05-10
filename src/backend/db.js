// src/backend/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pathlytics",
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
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`✅ Added missing '${column}' column to ${table} table.`);
    }
  } catch (error) {
    console.error(`❌ Failed to add '${column}' column:`, error.message);
  }
};

const initSchema = async () => {
  try {
    // Existing user columns
    await addColumnIfMissing("users", "otp", "VARCHAR(10)");
    await addColumnIfMissing("users", "avatar_url", "VARCHAR(500) DEFAULT NULL");
    await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 0");

    await addColumnIfMissing("user_providers", "provider_id", "VARCHAR(255) NOT NULL DEFAULT ''");
    await addColumnIfMissing("user_providers", "provider_email", "VARCHAR(255) DEFAULT NULL");

    // ADD THIS LINE to make old column optional:
    await db.query("ALTER TABLE user_providers MODIFY COLUMN provider_user_id VARCHAR(255) DEFAULT ''").catch(() => {});
        // Make password nullable for OAuth-only accounts
    try {
      await db.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT ''");
    } catch (err) {
      // Ignore if already correct
    }

    // ============ NEW: user_providers table ============
    const providersExists = await tableExists("user_providers");
    if (!providersExists) {
      await db.query(`
        CREATE TABLE user_providers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          provider VARCHAR(20) NOT NULL,
          provider_id VARCHAR(255) NOT NULL,
          provider_email VARCHAR(255) DEFAULT NULL,
          linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_provider_account (provider, provider_id),
          UNIQUE KEY unique_user_provider (user_id, provider),
          INDEX idx_user (user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log("✅ Created user_providers table.");

      // Migrate existing oauth data from users table → user_providers (if any)
      const hasOldProvider = await columnExists("users", "oauth_provider");
      if (hasOldProvider) {
        try {
          const [oldData] = await db.query(
            `SELECT id, oauth_provider, oauth_id, email
             FROM users
             WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL`
          );

          for (const u of oldData) {
            try {
              await db.query(
                `INSERT IGNORE INTO user_providers (user_id, provider, provider_id, provider_email)
                 VALUES (?, ?, ?, ?)`,
                [u.id, u.oauth_provider, u.oauth_id, u.email]
              );
            } catch (e) {
              // ignore duplicates
            }
          }
          if (oldData.length > 0) {
            console.log(`✅ Migrated ${oldData.length} OAuth records to user_providers.`);
          }
        } catch (e) {
          console.error("Migration warning:", e.message);
        }
      }
    }

    console.log("✅ Database schema initialized successfully.");
  } catch (error) {
    console.error("❌ Database schema initialization failed:", error.message);
  }
};

initSchema();

export default db;
