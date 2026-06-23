import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import RecruiterGuard from "@/components/recruiter/RecruiterGuard";
import LoadingScreen from "@/components/LoadingScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthCallback from "./pages/AuthCallback";
import BlogDetail from "@/pages/BlogDetail";
import InterviewLanding from "@/pages/InterviewLanding";
import InterviewSession from "@/pages/InterviewSession";
import InterviewResults from "@/pages/InterviewResults";
import CareerTipDetail from "@/pages/CareerTipDetail";

// ── New legal + about pages (NOT lazy — small, always needed) ──
import About           from "@/pages/About";
import PrivacyPolicy   from "@/pages/PrivacyPolicy";
import TermsOfService  from "@/pages/TermsOfService";

// ----------------------------------------------------------------------
// Lazy-loaded pages (code splitting)
// ----------------------------------------------------------------------

// Public
const Dashboard                  = lazy(() => import("./pages/Dashboard"));
const Login                      = lazy(() => import("./pages/Login"));
const SignUp                     = lazy(() => import("./pages/SignUp"));
const ForgotPassword             = lazy(() => import("./pages/ForgotPassword"));
const Blog                       = lazy(() => import("./pages/Blog"));
const Jobs                       = lazy(() => import("./pages/Jobs"));
const CareerTips                 = lazy(() => import("./pages/CareerTips"));
const IndustryInsights           = lazy(() => import("./pages/IndustryInsights"));
const SuccessStories             = lazy(() => import("./pages/SuccessStories"));
const NotFound                   = lazy(() => import("./pages/NotFound"));

// Protected
const Profile                    = lazy(() => import("./pages/Profile"));
const CareerRecommendationInput  = lazy(() => import("./pages/CareerRecommendationInput"));
const CareerRecommendationResults= lazy(() => import("./pages/CareerRecommendationResults"));
const CareerRoadmaps             = lazy(() => import("./pages/CareerRoadmaps"));
const CareerRoadmapDetail        = lazy(() => import("./pages/CareerRoadmapDetail"));
const Chatbot                    = lazy(() => import("./pages/Chatbot"));
const SavedCareers               = lazy(() => import("./pages/SavedCareers"));
const Settings                   = lazy(() => import("./pages/Settings"));
const ChangePassword             = lazy(() => import("./pages/ChangePassword"));
const TwoFactorAuth              = lazy(() => import("./pages/TwoFactorAuth"));
const OAuthSuccess               = lazy(() => import("./pages/OAuthSuccess"));

// Recruiter pages (lazy — only loaded when a recruiter is logged in)
const RecruiterDashboard         = lazy(() => import("./pages/recruiter/RecruiterDashboard"));
const PostJob                    = lazy(() => import("./pages/recruiter/PostJob"));
const ManageJobs                 = lazy(() => import("./pages/recruiter/ManageJobs"));
const ApplicationsReview        = lazy(() => import("./pages/recruiter/ApplicationsReview"));
const RecruiterProfileSetup      = lazy(() => import("./pages/recruiter/RecruiterProfileSetup"));

// ----------------------------------------------------------------------
// React Query client
// ----------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// ----------------------------------------------------------------------
// Scroll to top on route change
// ----------------------------------------------------------------------
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

// ----------------------------------------------------------------------
// App
// ----------------------------------------------------------------------
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

                  {/* ── Public routes ── */}
                  <Route path="/"                   element={<Dashboard />} />
                  <Route path="/login"              element={<Login />} />
                  <Route path="/signup"             element={<SignUp />} />
                  <Route path="/forgot-password"    element={<ForgotPassword />} />
                  <Route path="/blog"               element={<Blog />} />
                  <Route path="/blog/:id"           element={<BlogDetail />} />
                  <Route path="/jobs"               element={<Jobs />} />
                  <Route path="/career-tips"        element={<CareerTips />} />
                  <Route path="/industry-insights"  element={<IndustryInsights />} />
                  <Route path="/success-stories"    element={<SuccessStories />} />
                  <Route path="/oauth-success"      element={<OAuthSuccess />} />
                  <Route path="/auth/callback"      element={<AuthCallback />} />

                  {/* ── Static / Legal pages ── */}
                  <Route path="/about"              element={<About />} />
                  <Route path="/privacy-policy"     element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service"   element={<TermsOfService />} />

                  {/* ── Protected routes ── */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard"                    element={<Dashboard />} />
                    <Route path="/profile"                      element={<Profile />} />
                    <Route path="/career-recommendation"        element={<CareerRecommendationInput />} />
                    <Route path="/career-recommendation/results" element={<CareerRecommendationResults />} />
                    <Route path="/interview"                    element={<InterviewLanding />} />
                    <Route path="/interview/:careerId/session"  element={<InterviewSession />} />
                    <Route path="/interview/:careerId/results"  element={<InterviewResults />} />
                    <Route path="/roadmaps"                     element={<CareerRoadmaps />} />
                    <Route path="/roadmaps/:careerId"           element={<CareerRoadmapDetail />} />
                    <Route path="/chatbot"                      element={<Chatbot />} />
                    <Route path="/saved-careers"                element={<SavedCareers />} />
                    <Route path="/settings"                     element={<Settings />} />
                    <Route path="/change-password"              element={<ChangePassword />} />
                    <Route path="/two-factor-auth"              element={<TwoFactorAuth />} />
                    <Route path="/career-tips/:id"             element={<CareerTipDetail />} />
                  </Route>

                  {/* ── Recruiter routes (any verified recruiter) ── */}
                  <Route element={<RecruiterGuard />}>
                    <Route path="/recruiter/profile"                      element={<RecruiterProfileSetup />} />
                    <Route path="/recruiter/dashboard"                    element={<RecruiterDashboard />} />
                    <Route path="/recruiter/jobs"                         element={<ManageJobs />} />
                    <Route path="/recruiter/jobs/:jobId/applications"     element={<ApplicationsReview />} />
                  </Route>

                  {/* Recruiter routes that need verification to access */}
                  <Route element={<RecruiterGuard requireVerified />}>
                    <Route path="/recruiter/jobs/new"                     element={<PostJob />} />
                  </Route>

                  {/* ── 404 catch-all ── */}
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