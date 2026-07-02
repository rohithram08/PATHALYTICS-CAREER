// src/backend/middleware/turnstile.js
// ─────────────────────────────────────────────────────────────
// Cloudflare Turnstile bot protection for auth forms.
//
// Setup: create a Turnstile widget at https://dash.cloudflare.com/
//        → Turnstile, then set:
//          TURNSTILE_SECRET_KEY   (backend, .env)
//          VITE_TURNSTILE_SITE_KEY (frontend, .env — public, safe to expose)
//
// Same tier as EMAIL_USER/EMAIL_PASS in validateEnv.js: if the key
// isn't configured, the check is skipped with a one-time warning
// rather than blocking every signup/login in local dev. Once
// TURNSTILE_SECRET_KEY is set, verification is enforced for real.
// ─────────────────────────────────────────────────────────────

let warnedOnce = false;

export function isTurnstileConfigured() {
  return !!process.env.TURNSTILE_SECRET_KEY?.trim();
}

/**
 * Express middleware — expects the client to send the widget's response
 * token as `turnstileToken` in the JSON body.
 */
export async function verifyTurnstile(req, res, next) {
  if (!isTurnstileConfigured()) {
    if (!warnedOnce) {
      console.warn(
        "⚠️  TURNSTILE_SECRET_KEY not set — bot-protection check is DISABLED. " +
        "Set it in your .env to enforce Turnstile on auth forms."
      );
      warnedOnce = true;
    }
    return next();
  }

  const token = req.body?.turnstileToken;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Bot-verification challenge is required." });
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", process.env.TURNSTILE_SECRET_KEY);
    params.append("response", token);
    if (req.ip) params.append("remoteip", req.ip);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const result = await verifyRes.json();

    if (!result.success) {
      console.warn("[turnstile] verification failed:", result["error-codes"]);
      return res.status(400).json({ message: "Bot-verification challenge failed. Please try again." });
    }

    next();
  } catch (err) {
    // Fail closed on network/API errors — better to briefly block auth
    // than to silently disable bot protection because Cloudflare's API
    // had a hiccup.
    console.error("[turnstile] verification error:", err.message);
    return res.status(503).json({ message: "Bot-verification service unavailable. Please try again shortly." });
  }
}
