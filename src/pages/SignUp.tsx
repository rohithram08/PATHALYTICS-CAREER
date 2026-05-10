// src/pages/SignUp.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Chrome,
  Github,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import favicon from "@/public/favicon.svg";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agree: false,
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    agree?: string;
  }>({});

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    const messages: Record<string, string> = {
      google_auth_failed: "Google sign-up was cancelled or failed.",
      github_auth_failed: "GitHub sign-up was cancelled or failed.",
      token_failed: "Could not generate authentication token.",
      oauth_failed: "OAuth authentication failed.",
      account_exists: "An account with this email already exists.",
    };

    toast.error("Sign-up failed", {
      description: messages[error] || "Please try again.",
    });

    setOauthLoading(null);
  }, [searchParams]);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.agree) {
      newErrors.agree = "You must accept the terms to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseJsonSafely = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return { message: "Unexpected server response" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.message || "Sign-up failed");
      }

      if (data?.token) {
        await authLogin(data.token);
        toast.success("Account created successfully!");
        navigate("/dashboard");
        return;
      }

      toast.success("Account created successfully!", {
        description: "Please sign in to continue.",
      });
      navigate("/login");
    } catch (err: any) {
      toast.error("Sign-up failed", {
        description: err?.message || "Unable to create account right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setOauthLoading("google");
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleGithubSignup = () => {
    setOauthLoading("github");
    window.location.href = `${API_URL}/api/auth/github`;
  };

  const passwordChecks = [
    { label: "At least 8 characters", valid: formData.password.length >= 8 },
    { label: "Contains a letter", valid: /[A-Za-z]/.test(formData.password) },
    { label: "Contains a number", valid: /\d/.test(formData.password) },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Create your account</h1>
            <p className="text-muted-foreground">
              Start your personalized career journey today
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              variant="outline"
              className="h-11"
              onClick={handleGoogleSignup}
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
              onClick={handleGithubSignup}
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
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className={`pl-10 h-11 ${errors.name ? "border-destructive" : ""}`}
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

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
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Choose a password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  className={`pl-10 pr-10 h-11 ${errors.password ? "border-destructive" : ""}`}
                  autoComplete="new-password"
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
                <p className="text-xs text-destructive">{errors.password}</p>
              )}

              {formData.password.length > 0 && (
                <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1">
                  {passwordChecks.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 text-xs ${
                        item.valid ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree"
                  checked={formData.agree}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, agree: !!checked });
                    if (errors.agree) setErrors({ ...errors, agree: undefined });
                  }}
                />
                <Label
                  htmlFor="agree"
                  className="text-sm font-normal cursor-pointer leading-relaxed"
                >
                  I agree to the{" "}
                  <Link to="/terms-of-service" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.agree && (
                <p className="text-xs text-destructive">{errors.agree}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 shadow-md"
              disabled={loading || oauthLoading !== null}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex relative bg-gradient-to-br from-primary via-emerald-600 to-cyan-600 items-center justify-center p-12 overflow-hidden">
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
            Build a career plan that actually fits you
          </h2>
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            Get matched to roles, follow curated roadmaps, and prepare with
            guided AI support from day one.
          </p>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6">
            <p className="text-white/95 italic mb-4">
              "I finally had clarity on what role matched my skills and how to
              prepare for it step by step."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                AK
              </div>
              <div>
                <p className="font-semibold text-sm">Aarav Kumar</p>
                <p className="text-xs text-white/70">Student User</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
