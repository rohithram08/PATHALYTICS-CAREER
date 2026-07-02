// remaining-flows-test.mjs
import mysql from "mysql2/promise";
import fs from "fs";

const BASE = "http://127.0.0.1:5099";
let passes = 0, failures = 0;
function ok(cond, label, extra = "") {
  if (cond) { passes++; console.log(`  ✅ ${label}`); }
  else { failures++; console.log(`  ❌ ${label} ${extra}`); }
}

function makeClient() {
  let cookie = "";
  async function call(method, path, body, isForm = false) {
    const headers = {};
    if (!isForm) headers["Content-Type"] = "application/json";
    if (cookie) headers["Cookie"] = cookie;
    const res = await fetch(`${BASE}${path}`, {
      method, headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    let json = null;
    try { json = await res.json(); } catch { /* ignore */ }
    return { status: res.status, json };
  }
  return {
    get: (p) => call("GET", p),
    post: (p, b, isForm) => call("POST", p, b, isForm),
    patch: (p, b) => call("PATCH", p, b),
  };
}

const db = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
});

async function main() {
  const recruiter = makeClient();
  const email = `recruiter_docs_${Date.now()}@gmail.com`;

  console.log("\n— Setup: generic-domain recruiter signup (starts 'pending') —");
  const signup = await recruiter.post("/api/auth/signup", {
    name: "Doc Test Recruiter", email, password: "P@ssw0rd123",
    role: "recruiter", companyName: "Freelance Co", companySize: "1-10", industry: "Tech",
  });
  ok(signup.status === 201, "signup → 201");

  const candidateClient = makeClient();
  await candidateClient.post("/api/auth/signup", {
    name: "Talent Pool Candidate", email: `talentpool_${Date.now()}@example.com`, password: "P@ssw0rd123",
  });

  console.log("\n— Document upload (multipart) —");
  fs.writeFileSync("/tmp/test-doc.pdf", "%PDF-1.4 fake pdf content for testing\n");
  const form = new FormData();
  form.append("document_type", "gst_certificate");
  form.append("document", new Blob([fs.readFileSync("/tmp/test-doc.pdf")], { type: "application/pdf" }), "gst.pdf");

  const upload = await recruiter.post("/api/recruiter/documents/upload", form, true);
  ok(upload.status === 201, "POST /api/recruiter/documents/upload → 201", JSON.stringify(upload.json));

  const list = await recruiter.get("/api/recruiter/documents");
  ok(list.status === 200 && list.json.length === 1, "GET /api/recruiter/documents shows 1 doc", JSON.stringify(list.json));
  ok(list.json?.[0]?.status === "pending", "uploaded doc status is 'pending'");

  console.log("\n— Admin: create admin user directly, review + approve —");
  const adminEmail = `admin_${Date.now()}@pathalytics.internal`;
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.default.hash("AdminPass123!", 10);
  const [adminResult] = await db.query(
    "INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, 'admin', 1)",
    ["Test Admin", adminEmail, hash]
  );

  const admin = makeClient();
  const adminLogin = await admin.post("/api/auth/login", { email: adminEmail, password: "AdminPass123!" });
  ok(adminLogin.status === 200, "admin login → 200", JSON.stringify(adminLogin.json));

  const pendingDocs = await admin.get("/api/admin/verifications");
  ok(pendingDocs.status === 200, "GET /api/admin/verifications → 200", JSON.stringify(pendingDocs.json));
  const doc = Array.isArray(pendingDocs.json) ? pendingDocs.json[0] : pendingDocs.json?.documents?.[0];
  ok(!!doc, "at least one pending document visible to admin", JSON.stringify(pendingDocs.json));

  if (doc) {
    const approve = await admin.patch(`/api/admin/verifications/${doc.id}`, { action: "approve" });
    ok(approve.status === 200, "PATCH /api/admin/verifications/:id approve → 200", JSON.stringify(approve.json));

    const [[profile]] = await db.query(
      "SELECT verification_status FROM recruiter_profiles WHERE user_id = (SELECT id FROM users WHERE email = ?)",
      [email]
    );
    ok(profile.verification_status === "approved", `recruiter_profiles.verification_status is 'approved' (got '${profile.verification_status}')`);
  }

  console.log("\n— Talent pool + messages —");
  // Re-approve the recruiter above lets them act as a normal verified
  // recruiter for these two features.
  const [[candidateRow]] = await db.query(
    "SELECT id FROM users WHERE role = 'user' LIMIT 1"
  );
  if (candidateRow) {
    const save = await recruiter.post(`/api/recruiter/talent-pool/${candidateRow.id}`, { notes: "Strong candidate" });
    ok(save.status === 200, "POST /api/recruiter/talent-pool/:userId → 200", JSON.stringify(save.json));

    const pool = await recruiter.get("/api/recruiter/talent-pool");
    ok(pool.status === 200 && pool.json.length >= 1, "GET /api/recruiter/talent-pool shows saved candidate", JSON.stringify(pool.json));

    const msg = await recruiter.post("/api/recruiter/messages", {
      recipient_id: candidateRow.id, subject: "Regarding your application", body: "Hi, are you still interested?",
    });
    ok(msg.status === 201, "POST /api/recruiter/messages → 201", JSON.stringify(msg.json));

    const msgs = await recruiter.get("/api/recruiter/messages");
    ok(msgs.status === 200 && msgs.json.length >= 1, "GET /api/recruiter/messages shows sent message", JSON.stringify(msgs.json));
  } else {
    console.log("  ⚠️  no candidate user found to test talent-pool/messages against");
  }

  console.log(`\n${"=".repeat(50)}\nRESULT: ${passes} passed, ${failures} failed\n${"=".repeat(50)}`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Test crashed:", err); process.exit(1); });
