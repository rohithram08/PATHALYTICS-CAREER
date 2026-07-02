// src/App.tsx — MERGED (Doc 1 base · Doc 2 additions)
// Items marked "← Doc 2" are new additions from the second file.

import { lazy, Suspense, useEffect } from "react";
import { Toaster }                   from "@/components/ui/sonner";
import { TooltipProvider }           from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider }             from "next-themes";

import ErrorBoundary          from "@/components/ErrorBoundary";
import ProtectedRoute         from "@/components/ProtectedRoute";
import RecruiterGuard         from "@/components/recruiter/RecruiterGuard";
import RecruiterLayout        from "@/components/recruiter/RecruiterLayout";
import LoadingScreen          from "@/components/LoadingScreen";
import { AuthProvider }       from "@/hooks/useAuth";
import { GuestGuard }         from "@/components/guards/Guards";          // ← Doc 2

// ── Non-lazy (tiny / always-needed / outside Suspense context) ────────────────
import AuthCallback     from "./pages/AuthCallback";
import BlogDetail       from "@/pages/BlogDetail";
import InterviewLanding from "@/pages/InterviewLanding";
import InterviewSession from "@/pages/InterviewSession";
import InterviewResults from "@/pages/InterviewResults";
import CareerTipDetail  from "@/pages/CareerTipDetail";
import About            from "@/pages/About";
import PrivacyPolicy    from "@/pages/PrivacyPolicy";
import TermsOfService   from "@/pages/TermsOfService";

// ── Lazy-loaded pages (code splitting) ───────────────────────────────────────

// Public / landing
const Index                       = lazy(() => import("./pages/Index"));                           // ← Doc 2
const Dashboard                   = lazy(() => import("./pages/Dashboard"));
const Blog                        = lazy(() => import("./pages/Blog"));
const Jobs                        = lazy(() => import("./pages/Jobs"));
const CareerTips                  = lazy(() => import("./pages/CareerTips"));
const IndustryInsights            = lazy(() => import("./pages/IndustryInsights"));
const SuccessStories              = lazy(() => import("./pages/SuccessStories"));
const OAuthSuccess                = lazy(() => import("./pages/OAuthSuccess"));
const NotFound                    = lazy(() => import("./pages/NotFound"));

// Guest-only auth pages
const Login                       = lazy(() => import("./pages/Login"));
const SignUp                      = lazy(() => import("./pages/SignUp"));
const VerifyEmail                 = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword              = lazy(() => import("./pages/ForgotPassword"));

// Protected – students / regular users
const Profile                     = lazy(() => import("./pages/Profile"));
const CareerRecommendationInput   = lazy(() => import("./pages/CareerRecommendationInput"));
const CareerRecommendationResults = lazy(() => import("./pages/CareerRecommendationResults"));
const CareerRoadmaps              = lazy(() => import("./pages/CareerRoadmaps"));
const CareerRoadmapDetail         = lazy(() => import("./pages/CareerRoadmapDetail"));
const Chatbot                     = lazy(() => import("./pages/Chatbot"));
const SavedCareers                = lazy(() => import("./pages/SavedCareers"));
const Settings                    = lazy(() => import("./pages/Settings"));
const ChangePassword              = lazy(() => import("./pages/ChangePassword"));
const TwoFactorAuth               = lazy(() => import("./pages/TwoFactorAuth"));
const CandidateProfileSetup       = lazy(() => import("./pages/CandidateProfileSetup"));

// Recruiter
const RecruiterDashboard          = lazy(() => import("./pages/recruiter/RecruiterDashboard"));
const PostJob                     = lazy(() => import("./pages/recruiter/PostJob"));
const ManageJobs                  = lazy(() => import("./pages/recruiter/ManageJobs"));
const ApplicationsReview          = lazy(() => import("./pages/recruiter/ApplicationsReview"));
const RecruiterProfileSetup       = lazy(() => import("./pages/recruiter/RecruiterProfileSetup"));
const EditJob                     = lazy(() => import("./pages/recruiter/EditJob"));
const CandidatesList              = lazy(() => import("./pages/recruiter/CandidatesList"));
const RecruiterCandidates         = lazy(() => import("./pages/recruiter/RecruiterCandidates")); // ← Doc 2
const RecruiterAnalytics          = lazy(() => import("./pages/recruiter/RecruiterAnalytics"));  // ← Doc 2
const RecruiterJobForm            = lazy(() => import("./pages/recruiter/RecruiterJobForm"));    // ← Doc 2

// Admin
const AdminVerifications          = lazy(() => import("./pages/AdminVerifications"));

// ─── QueryClient ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

// ─── Scroll to top on route change ────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => (
  <ErrorBoundary>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <Toaster richColors position="top-right" closeButton />
              <ScrollToTop />
              <Suspense fallback={<LoadingScreen />}>
                <Routes>

                  {/* ── Public ─────────────────────────────────────────────────── */}
                  <Route path="/"                   element={<Index />} />          {/* ← Doc 2: landing page split from Dashboard */}
                  <Route path="/blog"               element={<Blog />} />
                  <Route path="/blog/:id"           element={<BlogDetail />} />
                  <Route path="/career-tips"        element={<CareerTips />} />
                  <Route path="/industry-insights"  element={<IndustryInsights />} />
                  <Route path="/success-stories"    element={<SuccessStories />} />
                  <Route path="/oauth-success"      element={<OAuthSuccess />} />
                  <Route path="/auth/callback"      element={<AuthCallback />} />
                  <Route path="/about"              element={<About />} />
                  <Route path="/privacy-policy"     element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service"   element={<TermsOfService />} />

                  {/* ── Guest-only (redirects authenticated users to /dashboard) ─ */}
                  {/* GuestGuard from Doc 2 — make sure @/components/guards/Guards exports it */}
                  <Route path="/login"
                    element={<GuestGuard><Login /></GuestGuard>} />
                  <Route path="/signup"
                    element={<GuestGuard><SignUp /></GuestGuard>} />
                  <Route path="/forgot-password"
                    element={<GuestGuard><ForgotPassword /></GuestGuard>} />

                  {/* Reached right after signup — user already has a session,
                      so this is deliberately NOT behind GuestGuard. */}
                  <Route path="/verify-email" element={<VerifyEmail />} />

                  {/* ── Protected (students / regular users) ───────────────────── */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard"                      element={<Dashboard />} />
                    <Route path="/profile"                        element={<Profile />} />
                    <Route path="/career-recommendation"          element={<CareerRecommendationInput />} />
                    <Route path="/career-recommendation/results"  element={<CareerRecommendationResults />} />
                    <Route path="/interview"                      element={<InterviewLanding />} />
                    <Route path="/interview/:careerId/session"    element={<InterviewSession />} />
                    <Route path="/interview/:careerId/results"    element={<InterviewResults />} />
                    <Route path="/roadmaps"                       element={<CareerRoadmaps />} />
                    <Route path="/roadmaps/:careerId"             element={<CareerRoadmapDetail />} />
                    <Route path="/chatbot"                        element={<Chatbot />} />
                    <Route path="/saved-careers"                  element={<SavedCareers />} />
                    <Route path="/settings"                       element={<Settings />} />
                    <Route path="/change-password"                element={<ChangePassword />} />
                    <Route path="/two-factor-auth"                element={<TwoFactorAuth />} />
                    <Route path="/career-tips/:id"                element={<CareerTipDetail />} />
                    <Route path="/career-profile"                 element={<CandidateProfileSetup />} />
                    <Route path="/jobs"                           element={<Jobs />} />
                  </Route>

                  {/* ── Admin ──────────────────────────────────────────────────── */}
                  <Route element={<RecruiterGuard adminOnly />}>
                    <Route path="/admin/verifications" element={<AdminVerifications />} />
                  </Route>

                  {/* ── Recruiter ──────────────────────────────────────────────────────────────
                  //
                  //  Structure:
                  //    RecruiterGuard          → checks isAuthenticated + isRecruiter
                  //      RecruiterLayout       → persistent sidebar, nav, logout (no remount on nav)
                  //        <pages>             → any logged-in recruiter
                  //        RecruiterGuard (requireVerified)
                  //          PostJob / RecruiterJobForm  → only verified recruiters
                  //
                  //  NOTE: React Router v6 always picks the more-specific static path (/jobs/new)
                  //  over the dynamic (:id / :jobId) even across guard wrappers, so there is no
                  //  route-order conflict here.
                  // ─────────────────────────────────────────────────────────────────────────── */}
                  <Route element={<RecruiterGuard />}>
                    <Route element={<RecruiterLayout />}>

                      {/* Any logged-in recruiter */}
                      <Route path="/recruiter/profile"                    element={<RecruiterProfileSetup />} />
                      <Route path="/recruiter/dashboard"                  element={<RecruiterDashboard />} />
                      <Route path="/recruiter/jobs"                       element={<ManageJobs />} />
                      <Route path="/recruiter/jobs/:jobId/applications"   element={<ApplicationsReview />} />
                      <Route path="/recruiter/jobs/:jobId/edit"           element={<EditJob />} />
                      <Route path="/recruiter/jobs/:id"                   element={<RecruiterJobForm />} />    {/* ← Doc 2 */}
                      <Route path="/recruiter/candidates"                 element={<CandidatesList />} />
                      <Route path="/recruiter/candidates/browse"          element={<RecruiterCandidates />} /> {/* ← Doc 2 */}
                      <Route path="/recruiter/analytics"                  element={<RecruiterAnalytics />} />  {/* ← Doc 2 */}

                      {/* Verified recruiters only */}
                      <Route element={<RecruiterGuard requireVerified />}>
                        <Route path="/recruiter/jobs/new" element={<PostJob />} />
                      </Route>

                    </Route>
                  </Route>

                  {/* ── 404 ────────────────────────────────────────────────────── */}
                  <Route path="*" element={<NotFound />} />

                </Routes>
              </Suspense>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;