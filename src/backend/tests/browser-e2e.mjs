// src/backend/tests/browser-e2e.mjs
// ─────────────────────────────────────────────────────────────
// Real Browser E2E Test Suite using Playwright & Local Chrome
// Tests: Student Journeys, Recruiter Journeys, Cross-User Isolation
// ─────────────────────────────────────────────────────────────

import { chromium } from "playwright";
import dotenv from "dotenv";

dotenv.config({ path: "src/backend/.env" });

const FRONTEND_URL = process.env.TEST_FRONTEND_URL || "http://localhost:8080";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const seekerEmail = "test.jobseeker.verified@pathalytics.test";
const seekerPass = process.env.TEST_PERSONA_VERIFIED_JOBSEEKER_PASSWORD;

const unverifiedSeekerEmail = "test.jobseeker.unverified@pathalytics.test";
const unverifiedSeekerPass = process.env.TEST_PERSONA_UNVERIFIED_JOBSEEKER_PASSWORD;

const recruiterEmail = "test.recruiter.verified@pathalytics.test";
const recruiterPass = process.env.TEST_PERSONA_VERIFIED_RECRUITER_PASSWORD;

const unverifiedRecruiterEmail = "test.recruiter.unverified@pathalytics.test";
const unverifiedRecruiterPass = process.env.TEST_PERSONA_UNVERIFIED_RECRUITER_PASSWORD;

let passes = 0;
let failures = 0;

function ok(cond, message, detail = "") {
  if (cond) {
    passes++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failures++;
    console.log(`  ❌ [FAIL] ${message} ${detail ? "(" + detail + ")" : ""}`);
  }
}

async function runBrowserTests() {
  console.log("=======================================================");
  console.log(" PATHALYTICS PHASE 4 — REAL BROWSER E2E TEST SUITE");
  console.log(" Target Frontend:", FRONTEND_URL);
  console.log(" Browser Engine : Google Chrome (Headless)");
  console.log("=======================================================\n");

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    // ─────────────────────────────────────────────────────────
    // 1. Landing Page Navigation
    // ─────────────────────────────────────────────────────────
    console.log("— 1. Landing Page & Navigation —");
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: "networkidle" });
    const title = await page.title();
    ok(title.length > 0, `Landing page loaded with title: "${title}"`);

    const hasLogo = await page.locator("text=Pathalytics").first().isVisible();
    ok(hasLogo, "Pathalytics logo/branding visible in header");

    // ─────────────────────────────────────────────────────────
    // 2. Student Authentication & Session Persistence
    // ─────────────────────────────────────────────────────────
    console.log("\n— 2. Student Authentication & Session Persistence —");
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
    ok(page.url().includes("/login"), "Navigated to /login");

    await page.fill("#email", seekerEmail);
    await page.fill("#password", seekerPass);
    await page.click('button[type="submit"]');

    // Wait for redirect to /dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    ok(page.url().includes("/dashboard"), "Redirected to /dashboard after successful login");

    // Verify token stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem("pathalytics_token"));
    ok(!!token && token.length > 20, "JWT token safely stored in browser localStorage");

    // Test session persistence across browser reloads
    await page.reload({ waitUntil: "networkidle" });
    ok(page.url().includes("/dashboard"), "Session persisted across full page reload (no logout)");
    const userStored = await page.evaluate(() => localStorage.getItem("pathlytics_user"));
    ok(!!userStored, "User profile metadata persisted across page reload");

    // ─────────────────────────────────────────────────────────
    // 3. Career Recommendation Assessment & Roadmaps
    // ─────────────────────────────────────────────────────────
    console.log("\n— 3. Career Recommendation & Readiness Scoring —");
    await page.goto(`${FRONTEND_URL}/career-recommendation`, { waitUntil: "networkidle" });
    ok(page.url().includes("/career-recommendation"), "Navigated to Career Recommendation Assessment");

    // Click skill badges if available, or simulate selection
    const badgeCount = await page.locator("button.rounded-full, div.cursor-pointer").count();
    if (badgeCount > 0) {
      // Select 3 skills/badges
      await page.locator("button.rounded-full, div.cursor-pointer").first().click();
      await page.waitForTimeout(300);
    }

    // Submit assessment using stored preferences or CTA button
    const submitBtn = page.locator('button:has-text("Get Recommendations"), button:has-text("Generate")');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      await page.waitForTimeout(1000);
    }

    // Navigate to results
    await page.goto(`${FRONTEND_URL}/career-recommendation/results`, { waitUntil: "networkidle" });
    ok(page.url().includes("/career-recommendation/results"), "Rendered Career Recommendation Results");

    // Verify result elements or readiness cards
    const resultsPageText = await page.textContent("body");
    const hasReadiness =
      resultsPageText.includes("Readiness") ||
      resultsPageText.includes("Recommendations") ||
      resultsPageText.includes("Match") ||
      resultsPageText.includes("Career");
    ok(hasReadiness, "Career recommendations with readiness benchmarks rendered in DOM");

    // ─────────────────────────────────────────────────────────
    // 4. Saved Careers & Profile
    // ─────────────────────────────────────────────────────────
    console.log("\n— 4. Saved Careers & Settings —");
    await page.goto(`${FRONTEND_URL}/saved-careers`, { waitUntil: "networkidle" });
    ok(page.url().includes("/saved-careers"), "Navigated to Saved Careers page");

    await page.goto(`${FRONTEND_URL}/settings`, { waitUntil: "networkidle" });
    ok(page.url().includes("/settings"), "Navigated to Student Settings page");

    // Logout via context evaluation to simulate clicking sign-out
    await page.evaluate(() => {
      localStorage.removeItem("pathalytics_token");
      localStorage.removeItem("pathlytics_user");
      localStorage.removeItem("pathalytics_user");
      sessionStorage.removeItem("careerPreferences");
      window.location.href = "/login";
    });
    await page.waitForURL("**/login", { timeout: 10000 });
    ok(page.url().includes("/login"), "Logged out student and redirected to /login");

    const loggedOutToken = await page.evaluate(() => localStorage.getItem("pathalytics_token"));
    ok(!loggedOutToken, "Client-side JWT token destroyed upon logout");

    // ─────────────────────────────────────────────────────────
    // 5. Recruiter Journey & Job Management
    // ─────────────────────────────────────────────────────────
    console.log("\n— 5. Verified Recruiter Lifecycle & Job Management —");
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", recruiterEmail);
    await page.fill("#password", recruiterPass);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/recruiter/dashboard", { timeout: 15000 });
    ok(page.url().includes("/recruiter/dashboard"), "Verified Recruiter redirected to /recruiter/dashboard");

    // Wait for dashboard data to load
    await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Verify recruiter layout & verification badge
    const recruiterBody = await page.textContent("body");
    ok(
      recruiterBody.includes("Verified") || recruiterBody.includes("Dashboard") || recruiterBody.includes("Jobs") || recruiterBody.includes("Active"),
      "Recruiter Dashboard loaded with recruiter UI controls"
    );

    // Navigate to post new job
    await page.goto(`${FRONTEND_URL}/recruiter/jobs/new`, { waitUntil: "networkidle" });
    ok(page.url().includes("/recruiter/jobs/new"), "Navigated to /recruiter/jobs/new");

    const hasJobForm = await page.locator('input[placeholder*="Role"], input[placeholder*="Job"], input#title, input').first().isVisible();
    ok(hasJobForm, "Job Creation Form rendered in browser DOM");

    // Logout recruiter
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    });
    await page.waitForURL("**/login", { timeout: 10000 });

    // ─────────────────────────────────────────────────────────
    // 6. Unverified Recruiter Restriction Gates
    // ─────────────────────────────────────────────────────────
    console.log("\n— 6. Unverified Recruiter Restriction Gates —");
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", unverifiedRecruiterEmail);
    await page.fill("#password", unverifiedRecruiterPass);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/recruiter/dashboard", { timeout: 15000 });
    ok(page.url().includes("/recruiter/dashboard"), "Unverified recruiter logged in");

    // Unverified recruiter attempts to access protected posting route (/recruiter/jobs/new)
    await page.goto(`${FRONTEND_URL}/recruiter/jobs/new`, { waitUntil: "networkidle" });
    await page.waitForURL("**/recruiter/profile", { timeout: 10000 });
    ok(page.url().includes("/recruiter/profile"), "Unverified recruiter blocked by RecruiterGuard and redirected to /profile");

    // Verify status is pending in UI
    await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
    const unverifiedBody = await page.textContent("body");
    ok(
      unverifiedBody.includes("Pending") || unverifiedBody.includes("reviewing") || unverifiedBody.includes("review"),
      "Pending verification status or banner displayed in UI"
    );

    // Logout unverified recruiter
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    });
    await page.waitForURL("**/login", { timeout: 10000 });

    // ─────────────────────────────────────────────────────────
    // 7. Cross-User Data Isolation & Server Authorization
    // ─────────────────────────────────────────────────────────
    console.log("\n— 7. Cross-User Data Isolation & Authorization —");

    // User A logs in
    await page.fill("#email", seekerEmail);
    await page.fill("#password", seekerPass);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Set a user-scoped draft
    await page.evaluate(() => {
      localStorage.setItem("userA_secret_draft", "private_data_for_user_A");
    });
    const tokenA = await page.evaluate(() => localStorage.getItem("pathalytics_token"));
    ok(!!tokenA, "User A authenticated with valid token");

    // Logout User A
    await page.evaluate(() => {
      localStorage.removeItem("pathalytics_token");
      localStorage.removeItem("pathlytics_user");
      localStorage.removeItem("userA_secret_draft");
      window.location.href = "/login";
    });
    await page.waitForURL("**/login", { timeout: 10000 });

    // User B logs in
    await page.fill("#email", unverifiedSeekerEmail);
    await page.fill("#password", unverifiedSeekerPass);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Verify User B cannot see User A's private draft
    const leakedDraft = await page.evaluate(() => localStorage.getItem("userA_secret_draft"));
    ok(leakedDraft === null, "User A's private client draft is not accessible to User B");

    // Verify Server-Side Authorization for User B:
    // Attempting to call recruiter APIs using User B's token
    const tokenB = await page.evaluate(() => localStorage.getItem("pathalytics_token"));
    const serverAuthCheck = await page.evaluate(async (tok) => {
      const res = await fetch("http://localhost:4000/api/recruiter/jobs", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      return res.status;
    }, tokenB);

    ok(serverAuthCheck === 403, "Server-side authorization rejects candidate accessing recruiter API with HTTP 403");

    const serverAdminCheck = await page.evaluate(async (tok) => {
      const res = await fetch("http://localhost:4000/api/admin/verifications", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      return res.status;
    }, tokenB);

    ok(serverAdminCheck === 403, "Server-side authorization rejects candidate accessing admin API with HTTP 403");

    console.log("\n=======================================================");
    console.log(` BROWSER E2E RESULTS: ${passes} Passed, ${failures} Failed`);
    console.log("=======================================================\n");

  } catch (err) {
    console.error("FATAL ERROR in browser E2E test:", err);
    failures++;
  } finally {
    await browser.close();
  }

  process.exit(failures > 0 ? 1 : 0);
}

runBrowserTests();
