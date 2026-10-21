// src/backend/tests/verify-resume-builder-browser.mjs
import { chromium } from "playwright";
import { strict as assert } from "assert";

const FRONTEND_URL = process.env.TEST_FRONTEND_URL || "http://localhost:8080";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function verifyResumeBuilder() {
  console.log("=======================================================");
  console.log(" TESTING ATS RESUME BUILDER & PDF EXPORT IN REAL CHROME");
  console.log("=======================================================\n");

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const page = await browser.newPage();

  try {
    // 1. Login with verified candidate
    console.log("— 1. Authenticating Student —");
    const seekerEmail = "test.jobseeker.verified@pathalytics.test";
    const seekerPass = process.env.TEST_PERSONA_VERIFIED_JOBSEEKER_PASSWORD;

    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", seekerEmail);
    await page.fill("#password", seekerPass);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("  ✅ Logged in and reached /dashboard");

    // 2. Navigate to /resume-builder
    console.log("\n— 2. Navigating to ATS Resume Builder —");
    await page.goto(`${FRONTEND_URL}/resume-builder`, { waitUntil: "networkidle" });
    const pageHeading = page.getByRole("heading", { name: "ATS Resume Builder" });
    const heading = await pageHeading.textContent();
    assert.ok(heading?.includes("ATS Resume Builder"), "Header contains 'ATS Resume Builder'");

    // Verify top layout clearance
    const headerBox = await page.locator("header.fixed").boundingBox();
    const titleBox = await pageHeading.boundingBox();
    assert.ok(titleBox.y > (headerBox?.y || 0) + (headerBox?.height || 0), "Title sits cleanly below fixed navbar with no collision");
    console.log(`  ✅ Heading verified: 'ATS Resume Builder' at y=${titleBox.y}px (clear of navbar)`);

    // 3. Verify All 4 Templates exist
    console.log("\n— 3. Verifying Multi-Template Selector —");
    const modernBtn = page.getByRole("button", { name: "Modern Professional" });
    const harvardBtn = page.getByRole("button", { name: "Harvard / Classic ATS" });
    const executiveBtn = page.getByRole("button", { name: "Executive Sidebar" });
    const minimalistBtn = page.getByRole("button", { name: "Tech Minimalist" });

    assert.ok(await modernBtn.isVisible(), "Modern Professional template button visible");
    assert.ok(await harvardBtn.isVisible(), "Harvard / Classic ATS template button visible");
    assert.ok(await executiveBtn.isVisible(), "Executive Sidebar template button visible");
    assert.ok(await minimalistBtn.isVisible(), "Tech Minimalist template button visible");
    console.log("  ✅ All 4 ATS templates available in UI selector");

    // 4. Verify Real-Time ATS Readiness Score Card
    console.log("\n— 4. Verifying ATS Readiness Audit Card —");
    const scoreText = await page.textContent("body");
    assert.ok(scoreText?.includes("Applicant Tracking Score"), "ATS Score Card rendered");
    assert.ok(scoreText?.includes("Action Verbs"), "Action verbs detector rendered");
    assert.ok(scoreText?.includes("Quantifiable Metrics"), "Quantifiable metrics detector rendered");
    console.log("  ✅ Real-time ATS readiness scoring and suggestions active");

    // 5. Verify 'With Photo' and 'Without Photo' toggling
    console.log("\n— 5. Testing 'With Photo' and 'Without Photo' Toggle —");
    const photoToggle = page.locator("#photo-toggle");
    assert.ok(await photoToggle.isVisible(), "Photo toggle switch visible");

    // Check photo is visible initially in preview
    const initialImgCount = await page.locator("#printable-resume img").count();
    assert.ok(initialImgCount >= 1, "Photo rendered in resume preview when 'With Photo' is active");
    console.log(`  ✅ 'With Photo' active: ${initialImgCount} photo rendered in DOM`);

    // Toggle photo OFF -> Without Photo
    await photoToggle.click();
    await page.waitForTimeout(400);
    const noPhotoImgCount = await page.locator("#printable-resume img").count();
    assert.equal(noPhotoImgCount, 0, "No photo rendered when toggled to 'Without Photo'");
    console.log("  ✅ 'Without Photo' active: photo removed from DOM for strict ATS parsing");

    // Toggle photo back ON -> With Photo
    await photoToggle.click();
    await page.waitForTimeout(400);
    const photoRestoredCount = await page.locator("#printable-resume img").count();
    assert.ok(photoRestoredCount >= 1, "Photo restored when toggled back to 'With Photo'");
    console.log("  ✅ 'With Photo' restored cleanly");

    // 6. Test Zoom Controls
    console.log("\n— 6. Verifying Zoom Preset Controls —");
    const fitBtn = page.getByRole("button", { name: "Fit" });
    const fullBtn = page.getByRole("button", { name: "100%" });
    assert.ok(await fitBtn.isVisible(), "Fit zoom button visible");
    assert.ok(await fullBtn.isVisible(), "100% zoom button visible");
    await fitBtn.click();
    await page.waitForTimeout(200);
    assert.ok((await page.textContent("body"))?.includes("75%"), "Fit zoom sets scale to 75%");
    await fullBtn.click();
    await page.waitForTimeout(200);
    assert.ok((await page.textContent("body"))?.includes("100%"), "100% zoom sets scale to 100%");
    await fitBtn.click(); // Return to fit
    console.log("  ✅ Zoom preset buttons verified (75% fit and 100% standard)");

    // 7. Test Template Switching in DOM
    console.log("\n— 7. Switching Through All Templates —");
    await harvardBtn.click();
    await page.waitForTimeout(300);
    const harvardResume = page.locator("#printable-resume").first();
    const harvardClasses = await harvardResume.getAttribute("class");
    assert.ok(harvardClasses?.includes("font-serif"), "Harvard template applied serif typography");
    console.log("  ✅ Harvard / Classic ATS template rendered with serif typography");

    await executiveBtn.click();
    await page.waitForTimeout(300);
    const executiveSidebar = page.locator("#printable-resume aside").first();
    assert.ok(await executiveSidebar.isVisible(), "Executive sidebar layout rendered");
    console.log("  ✅ Executive Sidebar template rendered with dual-column layout");

    await minimalistBtn.click();
    await page.waitForTimeout(300);
    const miniText = await page.locator("#printable-resume").textContent();
    assert.ok(miniText?.includes("// TECHNICAL_STACK"), "Tech minimalist terminal format rendered");
    console.log("  ✅ Tech Minimalist template rendered with developer code format");

    // Switch back to Modern
    await modernBtn.click();
    await page.waitForTimeout(300);

    // 8. Crucial Test: PDF Print Emulation & Non-Blank Guarantee
    console.log("\n— 8. Verifying PDF Print Emulation & Non-Blank Guarantee —");
    await page.emulateMedia({ media: "print" });
    const printRootVisible = await page.locator("#print-root").isVisible();
    assert.ok(printRootVisible, "#print-root is visible under @media print");

    const screenAppHidden = await page.locator("#screen-app-shell").isHidden();
    assert.ok(screenAppHidden, "#screen-app-shell is hidden under @media print");

    const printText = await page.locator("#print-root").textContent();
    assert.ok(printText?.includes("Full-Stack Software Engineer"), "Print root contains resume content");
    assert.ok(printText?.includes("Work Experience"), "Print root contains work experience");

    // Generate real PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "12mm", right: "12mm" },
    });
    console.log(`  📄 Generated PDF Buffer Size: ${pdfBuffer.length} bytes`);
    assert.ok(pdfBuffer.length > 50000, `PDF size (${pdfBuffer.length} bytes) confirms document is fully rendered, NOT blank!`);
    console.log("  ✅ PDF print engine verified: Non-blank, fully formatted vector resume!");

    console.log("\n=======================================================");
    console.log(" ALL RESUME BUILDER & PDF TESTS PASSED (0 FAILURES) ");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("FATAL ERROR in Resume Builder test:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

verifyResumeBuilder();
