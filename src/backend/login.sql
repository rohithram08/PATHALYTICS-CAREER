CREATE DATABASE IF NOT EXISTS pathlytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pathlytics;

-- ============================================================
-- Core users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) DEFAULT '',
  role ENUM('user', 'admin', 'mentor') DEFAULT 'user' NOT NULL,
  avatar_url LONGTEXT NULL,
  oauth_provider VARCHAR(20) DEFAULT NULL,
  oauth_id VARCHAR(255) DEFAULT NULL,
  otp VARCHAR(255) NULL,
  otp_expires_at DATETIME NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255) NULL,
  failed_login_attempts INT DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_oauth (oauth_provider, oauth_id)
);

-- ============================================================
-- Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Audit logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_action (user_id, action)
);

-- ============================================================
-- OAuth providers (for linking multiple sign-in methods)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_provider (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- One-time migration for EXISTING databases
-- (Safe to keep — IF NOT EXISTS / try-catch makes it idempotent)
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url LONGTEXT DEFAULT NULL;

-- If avatar_url existed as VARCHAR(500) from a previous migration,
-- this widens it. Safe to run repeatedly.
ALTER TABLE users MODIFY COLUMN avatar_url LONGTEXT NULL;