// src/pages/OAuthSuccess.tsx
// ─────────────────────────────────────────────────────────────
// SECURE version — identical UI to your original.
// Only the security logic changed (2 lines removed, 1 changed).
//
// WHAT CHANGED (only these lines):
//   REMOVED:  const token = searchParams.get("token")
//   REMOVED:  if (!token) { setStatus("error"); return; }
//   CHANGED:  await authLogin(token)  →  await authLogin("")
//
// WHY:
//   The old version read the JWT from the URL (?token=eyJ...)
//   That token was visible in browser history, server logs,
//   and any analytics script on the page.
//
//   The new oauth.js backend sets an httpOnly cookie instead
//   of putting the token in the URL. So there's no token to
//   read from the URL anymore — we just call authLogin("") which
//   triggers fetchUserProfile() and reads the cookie automatically.
//
// ZERO changes to AuthContext.tsx function names.
// ZERO changes to Login.tsx or SignUp.tsx.
// This file uses { login: authLogin } — exactly like your original.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth(); // ← same as your original, no change

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const finishOAuth = async () => {
      // ── REMOVED: const token = searchParams.get("token")
      // The new backend sends NO token in the URL.
      // It sets an httpOnly cookie during the OAuth callback instead.

      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        toast.error("OAuth failed", {
          description: "We could not complete social sign-in.",
        });
        return;
      }

      // ── REMOVED: if (!token) { setStatus("error"); return; }
      // There is no token in the URL anymore — that's intentional.

      try {
        // ── CHANGED: authLogin(token) → authLogin("")
        // authLogin("") still calls fetchUserProfile() inside AuthContext,
        // which does GET /api/auth/me — the browser sends the httpOnly
        // cookie automatically, so the server knows who we are.
        await authLogin("");

        setStatus("success");
        toast.success("Signed in successfully!");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1000);
      } catch {
        setStatus("error");
        toast.error("OAuth failed", {
          description: "Unable to create your session.",
        });
      }
    };

    finishOAuth();
  }, [authLogin, navigate, searchParams]);

  // ── UI below is 100% identical to your original ──────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardContent className="py-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Finalizing your sign-in
              </h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we prepare your account.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Sign-in successful
              </h1>
              <p className="text-sm text-muted-foreground mb-5">
                Redirecting you to your dashboard now.
              </p>
              <Button asChild>
                <Link to="/dashboard">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Sign-in could not be completed
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Please return to login and try again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/login">Go to Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthSuccess;