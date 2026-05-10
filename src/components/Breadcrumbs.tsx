// src/components/Breadcrumbs.tsx
import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "Profile",
  "career-recommendation": "Career Recommendation",
  results: "Results",
  roadmaps: "Roadmaps",
  chatbot: "AI Chatbot",
  "saved-careers": "Saved Careers",
  settings: "Settings",
  "change-password": "Change Password",
  "two-factor-auth": "Two-Factor Auth",
  blog: "Blog",
  "career-tips": "Career Tips",
  "industry-insights": "Industry Insights",
  "success-stories": "Success Stories",
  jobs: "Jobs",
  legal: "Legal",
};

// 🚫 Routes that act as "home" pages — never show breadcrumbs here
const HIDDEN_ROUTES = new Set([
  "/",
  "/dashboard",
  "/login",
  "/signup",
  "/forgot-password",
  "/oauth-success",
  "/auth/callback",
]);

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  // 🚫 Hide breadcrumbs on root, home/dashboard, and auth pages
  if (HIDDEN_ROUTES.has(location.pathname)) return null;
  if (pathnames.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6"
    >
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {pathnames.map((segment, index) => {
        const path = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label =
          routeLabels[segment] ||
          segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <Fragment key={path}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                to={path}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;