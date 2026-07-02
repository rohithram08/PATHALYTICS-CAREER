// src/pages/VerifyEmail.tsx
//
// Reached right after signup (SignUp.tsx navigates here when the signup
// response has requiresEmailVerification: true). Also linkable directly
// via /verify-email?email=... for a "resume verification later" flow.

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MailCheck, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parseJsonSafely(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

interface LocationState {
  email?: string;
  next?: string;
}

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [email] = useState(
    state.email || new URLSearchParams(location.search).get("email") || ""
  );
  const nextPath = state.next || "/dashboard";

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!email) {
      toast.error("Missing email", { description: "Please sign up again." });
      navigate("/signup");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code we emailed you.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired code");
      }

      toast.success("Email verified!");
      navigate(nextPath);
    } catch (err: unknown) {
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup_verify" }),
      });
      const data = await parseJsonSafely(res);

      if (res.status === 429) {
        setCooldownSeconds(data.retryAfterSeconds || 60);
        toast.info(data.message || "Please wait before requesting another code.");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Couldn't resend the code");

      toast.success("A new code is on its way.");
      setCooldownSeconds(60); // matches the "1st retry = 1 minute" rule server-side
    } catch (err: unknown) {
      toast.error("Couldn't resend the code", {
        description: err instanceof Error ? err.message : "Please try again shortly.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 mb-10 justify-center">
          <img src="/favicon.svg" alt="Pathalytics Logo" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold">Pathalytics</span>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
            Enter it below to activate your account.
          </p>

          <form onSubmit={handleVerify} className="space-y-5 text-left">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center tracking-[0.5em] text-lg font-mono h-12"
              />
            </div>

            <Button type="submit" className="w-full h-11 shadow-md" disabled={verifying || otp.length !== 6}>
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify email
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-sm text-muted-foreground">
            Didn't get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldownSeconds > 0}
              className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed font-medium"
            >
              {cooldownSeconds > 0
                ? `Resend in ${Math.floor(cooldownSeconds / 60)}:${String(cooldownSeconds % 60).padStart(2, "0")}`
                : resending
                ? "Sending..."
                : "Resend code"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate(nextPath)}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
