// src/components/recruiter/RecruiterGuard.tsx
//
// Two-level route guard for recruiter-only pages.
//
// Level 1 (always applied): user must be logged in with role=recruiter
// Level 2 (opt-in via requireVerified prop): recruiter must also be verified
//
// Usage in App.tsx:
//   <Route element={<RecruiterGuard />}>           ← any logged-in recruiter
//     <Route path="profile" element={<.../>} />
//   </Route>
//   <Route element={<RecruiterGuard requireVerified />}>  ← verified only
//     <Route path="jobs/new" element={<.../>} />
//   </Route>

import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  requireVerified?: boolean;
  adminOnly?: boolean;
}

const RecruiterGuard = ({ requireVerified = false, adminOnly = false }: Props) => {
  const { isAuthenticated, isLoading, isRecruiter, isVerifiedRecruiter, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Admin check — admins bypass all recruiter checks
  if (adminOnly) {
    if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
    return <Outlet />;
  }

  if (!isRecruiter) {
    // Logged-in but not a recruiter — send them back to the main dashboard.
    return <Navigate to="/dashboard" replace />;
  }

  if (requireVerified && !isVerifiedRecruiter) {
    // Recruiter is logged in but their account isn't verified yet.
    // Send them to their profile page so they can see what's pending.
    return <Navigate to="/recruiter/profile" replace />;
  }

  return <Outlet />;
};

export default RecruiterGuard;