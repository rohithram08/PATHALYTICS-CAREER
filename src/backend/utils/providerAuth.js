// src/backend/utils/providerAuth.js
import jwt from "jsonwebtoken";
import db from "../db.js";

export const createJwt = (user) =>
  jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

/**
 * Finds or creates a user from a social provider callback.
 *
 * Safe rules:
 * 1. If provider_user_id already in user_providers → log in as that user
 * 2. If email matches existing user → link provider to that user
 * 3. Else → create new user and link provider
 */
export const findOrCreateSocialUser = async ({
  provider,
  providerUserId,
  email,
  name,
  avatarUrl = null,
  emailVerified = true,
}) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Step 1: already linked by this provider identity?
    const [linked] = await conn.query(
      `SELECT u.*
       FROM user_providers up
       JOIN users u ON u.id = up.user_id
       WHERE up.provider = ? AND up.provider_user_id = ?
       LIMIT 1`,
      [provider, String(providerUserId)]
    );

    if (linked.length > 0) {
      await conn.commit();
      return { user: linked[0], isNew: false };
    }

    const normalizedEmail = (email || "").trim().toLowerCase();
    let user = null;

    // Step 2: existing account with same email?
    if (normalizedEmail) {
      const [existing] = await conn.query(
        `SELECT * FROM users WHERE email = ? LIMIT 1`,
        [normalizedEmail]
      );
      if (existing.length > 0) {
        user = existing[0];
        // Update name/avatar if they were empty
        await conn.query(
          `UPDATE users
           SET
             name = CASE WHEN (name IS NULL OR name = '') THEN ? ELSE name END,
             avatar_url = CASE WHEN avatar_url IS NULL THEN ? ELSE avatar_url END,
             email_verified = CASE WHEN ? = 1 THEN 1 ELSE email_verified END
           WHERE id = ?`,
          [name || user.name, avatarUrl, emailVerified ? 1 : 0, user.id]
        );

        const [refreshed] = await conn.query(
          `SELECT * FROM users WHERE id = ? LIMIT 1`,
          [user.id]
        );
        user = refreshed[0];
      }
    }

    // Step 3: no existing user → create one
    if (!user) {
      const [result] = await conn.query(
        `INSERT INTO users (name, email, password, avatar_url, email_verified)
         VALUES (?, ?, '', ?, ?)`,
        [name || "User", normalizedEmail, avatarUrl, emailVerified ? 1 : 0]
      );

      const [newUser] = await conn.query(
        `SELECT * FROM users WHERE id = ? LIMIT 1`,
        [result.insertId]
      );
      user = newUser[0];
    }

    // Link this provider to the user
    await conn.query(
      `INSERT INTO user_providers
         (user_id, provider, provider_user_id, provider_email)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE provider_email = VALUES(provider_email)`,
      [user.id, provider, String(providerUserId), normalizedEmail]
    );

    await conn.commit();
    return { user, isNew: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};