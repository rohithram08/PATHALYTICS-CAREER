// src/backend/scripts/seedTestPersonas.mjs
//
// Development-only seed script for four deterministic test personas:
//   1. Verified Job Seeker    2. Unverified Job Seeker
//   3. Verified Recruiter     4. Unverified Recruiter
//
// This script does NOT add any new way to authenticate. It writes rows
// directly to the database using the exact same schema, columns, and
// bcrypt hashing (bcryptjs, cost 12) that normal signup already uses —
// the accounts it creates log in through the completely unmodified
// POST /api/auth/login route, exactly like any other account. There is
// no special JWT path, no bypass flag, no test-mode branch anywhere in
// the application runtime. requireAuth, requireVerifiedRecruiter, and
// the normal signup/login/OTP code are all untouched by this file.
//
// SAFETY GATES — all three must pass, independently, before this script
// touches the database at all:
//   1. NODE_ENV must not be "production".
//   2. ALLOW_TEST_SEED must be exactly "true" — an explicit, separate
//      opt-in. NODE_ENV alone is not trusted, since a misconfigured or
//      unset NODE_ENV shouldn't be enough on its own to let this run.
//   3. SEED_CONFIRM_DB_HOST must be set and must exactly match the
//      DB_HOST this process is actually configured to connect to. This
//      deliberately avoids hardcoding a "known production host" list
//      (which can only ever be as complete as whatever hosts I already
//      know about) — instead, the developer has to consciously copy the
//      host they're about to seed and confirm it, every time.
//
// USAGE (see the chat report for the full variable list):
//   ALLOW_TEST_SEED=true SEED_CONFIRM_DB_HOST=<your DB_HOST> \
//   TEST_PERSONA_VERIFIED_JOBSEEKER_PASSWORD=... \
//   TEST_PERSONA_UNVERIFIED_JOBSEEKER_PASSWORD=... \
//   TEST_PERSONA_VERIFIED_RECRUITER_PASSWORD=... \
//   TEST_PERSONA_UNVERIFIED_RECRUITER_PASSWORD=... \
//   node src/backend/scripts/seedTestPersonas.mjs
//
// Safe to run repeatedly — see upsertUser/upsertRecruiterProfile/
// upsertCandidateProfile below. Only ever touches the four accounts
// identified by their fixed @pathalytics.test email addresses (a
// reserved-for-testing TLD per RFC 2606 — guaranteed to never collide
// with a real, deliverable address). Never deletes anything.

import "dotenv/config";
import bcrypt from "bcryptjs";
import db from "../db.js";

// ── Safety gates ──────────────────────────────────────────────
function assertSafeToRun() {
  const problems = [];

  if (process.env.NODE_ENV === "production") {
    problems.push('NODE_ENV is "production".');
  }
  if (process.env.ALLOW_TEST_SEED !== "true") {
    problems.push('ALLOW_TEST_SEED is not set to "true".');
  }
  const confirmHost = process.env.SEED_CONFIRM_DB_HOST;
  const actualHost = process.env.DB_HOST;
  if (!confirmHost) {
    problems.push("SEED_CONFIRM_DB_HOST is not set.");
  } else if (!actualHost || confirmHost !== actualHost) {
    problems.push("SEED_CONFIRM_DB_HOST does not match this process's configured DB_HOST.");
  }

  if (problems.length > 0) {
    console.error("\n❌ Refusing to run — safety gate(s) failed:\n");
    for (const p of problems) console.error(`   - ${p}`);
    console.error(
      "\nThis script requires ALL of: NODE_ENV != production, ALLOW_TEST_SEED=true, " +
        "and SEED_CONFIRM_DB_HOST set to exactly match your current DB_HOST.\n" +
        "See src/backend/scripts/seedTestPersonas.mjs's header comment for the full command.\n"
    );
    process.exit(1);
  }
}

function requirePassword(envVar) {
  const value = process.env[envVar];
  if (!value || value.length < 8) {
    console.error(`\n❌ ${envVar} is not set (or is under 8 characters). Refusing to run.\n`);
    process.exit(1);
  }
  return value;
}

// ── Upsert helpers (idempotent) ──────────────────────────────
async function upsertUser({ name, email, password, role, emailVerified }) {
  const [existing] = await db.query(
    "SELECT id, role, email_verified, password FROM users WHERE email = ?",
    [email]
  );

  if (existing.length === 0) {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?)",
      [name, email, hash, role, emailVerified ? 1 : 0]
    );
    return { userId: result.insertId, status: "CREATED" };
  }

  const row = existing[0];
  const passwordMatches = row.password ? await bcrypt.compare(password, row.password) : false;
  const roleCorrect = row.role === role;
  const verifiedCorrect = !!row.email_verified === emailVerified;

  if (passwordMatches && roleCorrect && verifiedCorrect) {
    return { userId: row.id, status: "ALREADY CORRECT" };
  }

  const hash = passwordMatches ? row.password : await bcrypt.hash(password, 12);
  await db.query(
    "UPDATE users SET name = ?, role = ?, email_verified = ?, password = ? WHERE id = ?",
    [name, role, emailVerified ? 1 : 0, hash, row.id]
  );
  return { userId: row.id, status: "UPDATED" };
}

async function upsertRecruiterProfile(userId, profile) {
  const [existing] = await db.query(
    "SELECT id, company_name, verification_status FROM recruiter_profiles WHERE user_id = ?",
    [userId]
  );
  const verifiedAt = profile.verificationStatus === "approved" ? new Date() : null;

  if (existing.length === 0) {
    await db.query(
      `INSERT INTO recruiter_profiles
         (user_id, company_name, company_size, industry, designation, company_website, verification_status, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, profile.companyName, profile.companySize, profile.industry, profile.designation, profile.website, profile.verificationStatus, verifiedAt]
    );
    return "CREATED";
  }

  const row = existing[0];
  if (row.company_name === profile.companyName && row.verification_status === profile.verificationStatus) {
    return "ALREADY CORRECT";
  }
  await db.query(
    `UPDATE recruiter_profiles
       SET company_name = ?, company_size = ?, industry = ?, designation = ?, company_website = ?,
           verification_status = ?, verified_at = ?
     WHERE user_id = ?`,
    [profile.companyName, profile.companySize, profile.industry, profile.designation, profile.website, profile.verificationStatus, verifiedAt, userId]
  );
  return "UPDATED";
}

async function upsertCandidateProfile(userId, profile) {
  const [existing] = await db.query("SELECT id, full_name FROM candidate_profiles WHERE user_id = ?", [userId]);

  if (existing.length === 0) {
    await db.query(
      `INSERT INTO candidate_profiles
         (user_id, full_name, location, years_of_experience, skills, is_visible_to_recruiters)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, profile.fullName, profile.location, profile.yearsOfExperience, JSON.stringify(profile.skills), profile.isVisibleToRecruiters]
    );
    return "CREATED";
  }

  const row = existing[0];
  if (row.full_name === profile.fullName) {
    return "ALREADY CORRECT";
  }
  await db.query(
    `UPDATE candidate_profiles
       SET full_name = ?, location = ?, years_of_experience = ?, skills = ?, is_visible_to_recruiters = ?
     WHERE user_id = ?`,
    [profile.fullName, profile.location, profile.yearsOfExperience, JSON.stringify(profile.skills), profile.isVisibleToRecruiters, userId]
  );
  return "UPDATED";
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  assertSafeToRun();

  const passwords = {
    verifiedJobSeeker: requirePassword("TEST_PERSONA_VERIFIED_JOBSEEKER_PASSWORD"),
    unverifiedJobSeeker: requirePassword("TEST_PERSONA_UNVERIFIED_JOBSEEKER_PASSWORD"),
    verifiedRecruiter: requirePassword("TEST_PERSONA_VERIFIED_RECRUITER_PASSWORD"),
    unverifiedRecruiter: requirePassword("TEST_PERSONA_UNVERIFIED_RECRUITER_PASSWORD"),
  };

  console.log("\nSeeding 4 test personas (NODE_ENV=" + process.env.NODE_ENV + ")...\n");

  // 1. Verified Job Seeker — full profile, ready to browse/apply.
  const vjs = await upsertUser({
    name: "Test JobSeeker (Verified)",
    email: "test.jobseeker.verified@pathalytics.test",
    password: passwords.verifiedJobSeeker,
    role: "user",
    emailVerified: true,
  });
  console.log(`[Verified Job Seeker]   users:               ${vjs.status}`);
  const vjsProfile = await upsertCandidateProfile(vjs.userId, {
    fullName: "Test JobSeeker (Verified)",
    location: "Bengaluru, India",
    yearsOfExperience: "0-1",
    skills: ["JavaScript", "React", "Node.js"],
    isVisibleToRecruiters: true,
  });
  console.log(`[Verified Job Seeker]   candidate_profiles:  ${vjsProfile}`);
  console.log(`                         (no resume file — resume_storage_key left null, see report)\n`);

  // 2. Unverified Job Seeker — deliberately bare, like a fresh signup
  // that hasn't touched their profile yet. No candidate_profiles row.
  const ujs = await upsertUser({
    name: "Test JobSeeker (Unverified)",
    email: "test.jobseeker.unverified@pathalytics.test",
    password: passwords.unverifiedJobSeeker,
    role: "user",
    emailVerified: false,
  });
  console.log(`[Unverified Job Seeker] users:               ${ujs.status}\n`);

  // 3. Verified Recruiter — approved company profile.
  const vr = await upsertUser({
    name: "Test Recruiter (Verified)",
    email: "test.recruiter.verified@pathalytics.test",
    password: passwords.verifiedRecruiter,
    role: "recruiter",
    emailVerified: true,
  });
  console.log(`[Verified Recruiter]    users:               ${vr.status}`);
  const vrProfile = await upsertRecruiterProfile(vr.userId, {
    companyName: "Pathalytics Test Co",
    companySize: "11-50",
    industry: "Technology",
    designation: "Talent Acquisition Lead",
    website: "https://example.test",
    verificationStatus: "approved",
  });
  console.log(`[Verified Recruiter]    recruiter_profiles:  ${vrProfile}\n`);

  // 4. Unverified Recruiter — pending, to test requireVerifiedRecruiter.
  const ur = await upsertUser({
    name: "Test Recruiter (Unverified)",
    email: "test.recruiter.unverified@pathalytics.test",
    password: passwords.unverifiedRecruiter,
    role: "recruiter",
    emailVerified: false,
  });
  console.log(`[Unverified Recruiter]  users:               ${ur.status}`);
  const urProfile = await upsertRecruiterProfile(ur.userId, {
    companyName: "Pending Test Co",
    companySize: "1-10",
    industry: "Technology",
    designation: "HR Coordinator",
    website: "https://pending.example.test",
    verificationStatus: "pending",
  });
  console.log(`[Unverified Recruiter]  recruiter_profiles:  ${urProfile}\n`);

  console.log("Done. Log in with the emails above through the normal login form.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
