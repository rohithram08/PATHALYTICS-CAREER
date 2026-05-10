// src/pages/AuthCallback.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();

  useEffect(() => {
    const completeAuth = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        toast.error("Authentication failed", {
          description: "Unable to complete sign-in. Please try again.",
        });
        navigate("/login");
        return;
      }

      if (!token) {
        toast.error("Authentication failed", {
          description: "No authentication token was provided.",
        });
        navigate("/login");
        return;
      }

      try {
        await authLogin(token);
        toast.success("Signed in successfully!");
        navigate("/dashboard", { replace: true });
      } catch {
        toast.error("Authentication failed", {
          description: "We could not complete your sign-in session.",
        });
        navigate("/login", { replace: true });
      }
    };

    completeAuth();
  }, [authLogin, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Completing sign-in
        </h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we securely log you in.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;