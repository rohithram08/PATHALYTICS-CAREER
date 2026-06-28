// src/components/guards/Guards.tsx
// ─────────────────────────────────────────────────────────────
// Route guards — all use the original useAuth API (isLoading / isAuthenticated)
// so they match the hook as written in useAuth.ts.
//
// Usage in App.tsx:
//   <Route path="/dashboard"        element={<AuthGuard><Dashboard /></AuthGuard>} />
//   <Route path="/recruiter/*"      element={<RecruiterGuard><RecruiterDashboard /></RecruiterGuard>} />
//   <Route path="/login"            element={<GuestGuard><Login /></GuestGuard>} />
// ─────────────────────────────────────────────────────────────

import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ── Shared loading spinner ────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// ── AuthGuard — any authenticated user ───────────────────────
// Redirects to /login if not logged in, preserving intended destination.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ── RecruiterGuard — recruiter or admin only ──────────────────
// Shows generic 403 if logged in as a regular user.
export function RecruiterGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isRecruiter } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isRecruiter) {
    // Logged in but wrong role — go back to user dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── AdminGuard — admin only ───────────────────────────────────
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ── GuestGuard — redirect already-logged-in users ────────────
// Wraps /login, /signup, /forgot-password so authenticated users
// don't land on those pages and get redirected to their dashboard.
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated && user) {
    const dest =
      user.role === "recruiter" || user.role === "admin"
        ? "/recruiter/dashboard"
        : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}