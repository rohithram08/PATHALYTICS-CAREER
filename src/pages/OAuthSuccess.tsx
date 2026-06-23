// src/pages/OAuthSuccess.tsx
// ─────────────────────────────────────────────────────────────
// OAuth success page — SECURE VERSION
//
// OLD behaviour:
//   Backend redirected to:  /oauth-success?token=eyJhbGc...
//   This page read token from URL, saved to localStorage.
//   PROBLEM: Token in URL = token in server logs, browser
//   history, Referer headers, analytics scripts.
//
// NEW behaviour:
//   Backend sets httpOnly cookie (no token in URL).
//   Backend redirects to:  /oauth-success?action=login|linked|created
//   This page calls GET /api/auth/me (cookie sent automatically).
//   If response is 200 → logged in, go to dashboard.
//   If 401 → something went wrong, go to /login.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowRight, AlertCircle, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Status = "loading" | "success" | "linked" | "created" | "error";

const MESSAGE_MAP: Record<string, { title: string; sub: string; status: Status }> = {
  login:   { title: "Signed in successfully!",       sub: "Taking you to your dashboard…",          status: "success" },
  linked:  { title: "Account linked!",               sub: "Your social account has been connected.", status: "linked"  },
  created: { title: "Account created!",              sub: "Welcome to Pathalytics!",                 status: "created" },
};

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken, refreshUser } = useAuth();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState({ title: "", sub: "" });

  useEffect(() => {
    const finish = async () => {
      // Check for error first
      const error = searchParams.get("error");
      if (error) {
        setStatus("error");
        toast.error("Sign-in failed", { description: "We could not complete social sign-in." });
        return;
      }

      const action = searchParams.get("action") || "login";

      // The httpOnly cookie was already set by the server.
      // Just call /me to confirm we're authenticated.
      try {
        await loginWithToken();   // internally calls fetchUser() → GET /api/auth/me with cookie

        const info = MESSAGE_MAP[action] || MESSAGE_MAP.login;
        setStatus(info.status);
        setMessage({ title: info.title, sub: info.sub });
        toast.success(info.title);

        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch {
        setStatus("error");
        toast.error("Sign-in could not be completed", {
          description: "Please try logging in again.",
        });
      }
    };

    finish();
  }, [loginWithToken, navigate, refreshUser, searchParams]);

  const isSuccessVariant = status === "success" || status === "linked" || status === "created";

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
                Finalizing your sign-in…
              </h1>
              <p className="text-sm text-muted-foreground">
                Please wait a moment.
              </p>
            </>
          )}

          {isSuccessVariant && (
            <>
              <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                status === "linked" ? "bg-blue-500/10" : "bg-green-500/10"
              }`}>
                {status === "linked"
                  ? <LinkIcon className="w-7 h-7 text-blue-500" />
                  : <CheckCircle2 className="w-7 h-7 text-green-500" />
                }
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                {message.title}
              </h1>
              <p className="text-sm text-muted-foreground mb-5">
                {message.sub}
              </p>
              <Button asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
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
                  <Link to="/login">Try Again</Link>
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