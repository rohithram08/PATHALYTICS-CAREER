// src/components/Layout.tsx
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
  showBreadcrumbs?: boolean;
  showFooter?: boolean;
  fullWidth?: boolean;
  noPadding?: boolean;
}

// 🚫 Routes where breadcrumbs should NEVER show
const HIDE_BREADCRUMBS_ROUTES = [
  "/",
  "/dashboard",
  "/login",
  "/signup",
  "/forgot-password",
  "/oauth-success",
  "/auth/callback",
];

// 🚫 Route prefixes where breadcrumbs should NEVER show
const HIDE_BREADCRUMBS_PREFIXES = [
  "/interview",
];

const Layout = ({
  children,
  showBreadcrumbs = true,
  showFooter = true,
  fullWidth = false,
  noPadding = false,
}: LayoutProps) => {
  const { pathname } = useLocation();

  // Auto-hide breadcrumbs on exact routes
  const isExactHidden = HIDE_BREADCRUMBS_ROUTES.includes(pathname);

  // Auto-hide breadcrumbs on prefix routes (e.g. /interview/*)
  const isPrefixHidden = HIDE_BREADCRUMBS_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const shouldShowBreadcrumbs =
    showBreadcrumbs && !isExactHidden && !isPrefixHidden;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 md:pt-18">
        {noPadding ? (
          // ── No padding mode (used by Interview session, etc.) ──────
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        ) : (
          // ── Normal padded mode ─────────────────────────────────────
          <div
            className={`${
              fullWidth ? "" : "max-w-7xl mx-auto"
            } px-4 sm:px-6 lg:px-8 py-8`}
          >
            {shouldShowBreadcrumbs && <Breadcrumbs />}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </div>
        )}
      </main>

      {showFooter && <Footer />}
      <BackToTop />
    </div>
  );
};

export default Layout;