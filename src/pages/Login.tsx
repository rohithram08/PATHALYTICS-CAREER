// src/pages/Login.tsx
// Changes from your original — exactly 2:
//   1. credentials: "include" added to the login fetch
//   2. catch (err: any) → catch (err) with instanceof check
//   Import stays as @/hooks/useAuth — unchanged from your original.

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Loader2,
  Github,
  Chrome,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth"; // ← kept as your original

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    const messages: Record<string, string> = {
      google_auth_failed: "Google sign-in was cancelled or failed.",
      github_auth_failed: "GitHub sign-in was cancelled or failed.",
      token_failed: "Could not generate authentication token.",
      oauth_failed: "OAuth authentication failed.",
      account_not_found: "No account was found for this provider.",
      invalid_callback: "The sign-in callback was invalid or expired.",
    };

    toast.error("Sign-in failed", {
      description: messages[error] || "Please try again.",
    });

    setOauthLoading(null);
  }, [searchParams]);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseErrorMessage = async (res: Response) => {
    try {
      const data = await res.json();
      return data;
    } catch {
      return { message: "Unexpected server response" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include", // ← ADDED: ensures httpOnly cookie is set
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await parseErrorMessage(res);

      if (!res.ok) {
        if (data.oauthOnly && data.providers) {
          toast.error("Please use OAuth to sign in", {
            description: data.message || "This account uses social login only.",
            duration: 6000,
          });
          return;
        }

        throw new Error(data.message || "Login failed");
      }

      if (!data?.token) {
        throw new Error("Authentication token was not returned");
      }

      await authLogin(data.token);
      toast.success("Welcome back!");
      if (data.user?.role === "recruiter") {
        navigate("/recruiter/dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) { // ← CHANGED: removed `: any`
      toast.error("Login failed", {
        description: err instanceof Error ? err.message : "Unable to sign in right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setOauthLoading("google");
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleGithubLogin = () => {
    setOauthLoading("github");
    window.location.href = `${API_URL}/api/auth/github`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-10">
            <img
              src="/favicon.svg"
              alt="Pathalytics Logo"
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold">Pathalytics</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to continue your career journey
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              variant="outline"
              className="h-11"
              onClick={handleGoogleLogin}
              disabled={loading || oauthLoading !== null}
              type="button"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Chrome className="w-4 h-4 mr-2 text-blue-500" />
              )}
              Google
            </Button>

            <Button
              variant="outline"
              className="h-11"
              onClick={handleGithubLogin}
              disabled={loading || oauthLoading !== null}
              type="button"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Github className="w-4 h-4 mr-2" />
              )}
              GitHub
            </Button>
          </div>

          <div className="relative mb-6">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-3 bg-background text-xs text-muted-foreground uppercase">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`pl-10 h-11 ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined });
                    }
                  }}
                  className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={formData.remember}
                onCheckedChange={(c) =>
                  setFormData({ ...formData, remember: !!c })
                }
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 shadow-md"
              disabled={loading || oauthLoading !== null}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 max-w-lg text-white"
        >
          <Sparkles className="w-12 h-12 mb-6 text-yellow-300" />
          <h2 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            Your career journey starts here
          </h2>
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            Discover personalized career paths, follow expert-curated roadmaps,
            and unlock your full potential with AI-powered guidance.
          </p>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6">
            <p className="text-white/95 italic mb-4">
              "Pathalytics transformed how I approach my career. The AI
              recommendations were spot-on!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                SJ
              </div>
              <div>
                <p className="font-semibold text-sm">Sarah Johnson</p>
                <p className="text-xs text-white/70">Software Engineer</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;