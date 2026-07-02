// cooldown-unit-test.mjs — run with the same DB env as the server
import mysql from "mysql2/promise";
import { checkResendCooldown, issueOtp } from "./utils/otpService.js";

const db = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
});

let passes = 0, failures = 0;
function ok(cond, label, extra = "") {
  if (cond) { passes++; console.log(`  ✅ ${label}`); }
  else { failures++; console.log(`  ❌ ${label} ${extra}`); }
}

// Move otp_last_sent_at back in time to simulate "N minutes have passed"
// without actually waiting.
async function fastForward(userId, minutesAgo) {
  await db.query(
    "UPDATE users SET otp_last_sent_at = DATE_SUB(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
    [minutesAgo, userId]
  );
}

async function main() {
  const [result] = await db.query(
    "INSERT INTO users (name, email, password, role) VALUES ('Cooldown Test', ?, '', 'user')",
    [`cooldown_${Date.now()}@example.com`]
  );
  const userId = result.insertId;

  console.log("\n— Escalating cooldown: 1min → 2min → 3min —");

  // Send #1 (fresh cycle) — always allowed.
  let c = await checkResendCooldown(userId);
  ok(c.allowed === true, "send #1 (fresh) allowed");
  await issueOtp(userId, "signup_verify", { resetCycle: c.resetCycle });

  // Immediately after send #1 → resend #1 requires 1 minute.
  c = await checkResendCooldown(userId);
  ok(c.allowed === false, "immediately after send #1, resend is blocked");
  ok(c.nextWaitMinutes === 1, `resend #1 requires 1 minute (got ${c.nextWaitMinutes})`);

  // Fast-forward 1 minute exactly → should now be allowed.
  await fastForward(userId, 1);
  c = await checkResendCooldown(userId);
  ok(c.allowed === true, "after 1 minute, resend #1 is allowed");
  await issueOtp(userId, "signup_verify", { resetCycle: c.resetCycle });

  // Immediately after resend #1 (now count=1) → resend #2 requires 2 minutes.
  c = await checkResendCooldown(userId);
  ok(c.allowed === false, "immediately after resend #1, next resend is blocked");
  ok(c.nextWaitMinutes === 2, `resend #2 requires 2 minutes (got ${c.nextWaitMinutes})`);

  // Only 1 minute passed (not enough for the 2-minute requirement) → still blocked.
  await fastForward(userId, 1);
  c = await checkResendCooldown(userId);
  ok(c.allowed === false, "after only 1 of 2 required minutes, still blocked");

  // Fast-forward the full 2 minutes → allowed.
  await fastForward(userId, 2);
  c = await checkResendCooldown(userId);
  ok(c.allowed === true, "after 2 minutes, resend #2 is allowed");
  await issueOtp(userId, "signup_verify", { resetCycle: c.resetCycle });

  // Immediately after resend #2 (count=2) → resend #3 requires 3 minutes.
  c = await checkResendCooldown(userId);
  ok(c.allowed === false, "immediately after resend #2, next resend is blocked");
  ok(c.nextWaitMinutes === 3, `resend #3 requires 3 minutes (got ${c.nextWaitMinutes})`);

  // Cycle reset: fast-forward 61 minutes of silence → treated as a fresh cycle.
  await fastForward(userId, 61);
  c = await checkResendCooldown(userId);
  ok(c.allowed === true, "after 61 minutes of silence, cycle resets and resend is allowed");
  ok(c.resetCycle === true, "resetCycle flag is set after long inactivity");

  await db.query("DELETE FROM users WHERE id = ?", [userId]);

  console.log(`\n${"=".repeat(50)}\nCOOLDOWN UNIT TEST: ${passes} passed, ${failures} failed\n${"=".repeat(50)}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
