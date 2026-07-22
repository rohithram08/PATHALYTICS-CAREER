// src/pages/OAuthSuccess.tsx
// ─────────────────────────────────────────────────────────────
// The OAuth callback (routes/oauth.js) redirects here with a
// short-lived, single-use `code` query param — not a JWT, and not
// relying on the cookie it also sets. This page immediately exchanges
// that code for the real JWT via POST /api/auth/oauth/exchange, which
// returns the token in a JSON response body, then logs in exactly like
// email/password auth does (authLogin(realToken)).
//
// Why not just read the cookie the callback set: that requires a
// cross-site fetch() from pathalytics.vercel.app to
// pathalytics-career.onrender.com to actually carry the cookie back,
// and modern browsers increasingly block that as a third-party cookie
// regardless of SameSite=None — a separate, newer restriction on top
// of SameSite that no cookie-attribute tuning gets around. The
// exchange code sidesteps it: no cookie involved in getting the token
// to this page, just a normal fetch response body.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const finishOAuth = async () => {
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        toast.error("OAuth failed", {
          description: "We could not complete social sign-in.",
        });
        return;
      }

      const code = searchParams.get("code");

      if (!code) {
        setStatus("error");
        toast.error("OAuth failed", {
          description: "Missing sign-in code. Please try again.",
        });
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/oauth/exchange`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.token) {
          throw new Error(data?.message || "Unable to complete sign-in.");
        }

        // Real JWT now, exactly like email/password login — everything
        // downstream (AuthContext, api.ts, route guards) works the same
        // way it already does for a normal login, no cookie required.
        await authLogin(data.token);

        setStatus("success");
        toast.success("Signed in successfully!");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1000);
      } catch (err) {
        setStatus("error");
        toast.error("OAuth failed", {
          description: err instanceof Error ? err.message : "Unable to create your session.",
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