// src/components/recruiter/RecruiterLayout.tsx
//
// Persistent sidebar layout for all recruiter pages.
// Desktop: sticky sidebar (w-64). Mobile: fixed top bar + slide-in drawer.

import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Plus, User,
  LogOut, Menu, X, CheckCircle2, AlertCircle, Clock,
  Users, BarChart3, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button }        from "@/components/ui/button";
import { cn }            from "@/lib/utils";
import { useAuth }       from "@/hooks/useAuth";
import type { AuthUser } from "@/hooks/useAuth"; // re-exports from AuthContext — both paths work

// ── Nav definition ────────────────────────────────────────────────────────────

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard",      href: "/recruiter/dashboard",  icon: LayoutDashboard },
  { label: "Manage Jobs",    href: "/recruiter/jobs",       icon: Briefcase       },
  { label: "Candidates",     href: "/recruiter/candidates", icon: Users           },
  { label: "Messages",       href: "/recruiter/messages",   icon: MessageSquare   },
  { label: "Analytics",      href: "/recruiter/analytics",  icon: BarChart3       },
  { label: "Profile & Docs", href: "/recruiter/profile",    icon: User            },
];

// ── Verification badge ────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status?: string }) {
  if (status === "verified")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="w-3 h-3" /> Verified
      </span>
    );
  if (status === "rejected")
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
        <AlertCircle className="w-3 h-3" /> Rejected
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-yellow-600">
      <Clock className="w-3 h-3" /> Pending review
    </span>
  );
}

// ── Brand logo ────────────────────────────────────────────────────────────────

function BrandLogo() {
  return (
    <>
      <span className="font-bold text-xl tracking-tight">
        Path<span className="text-primary">alytics</span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-1">
        Recruit
      </span>
    </>
  );
}

// ── Sidebar inner (shared between desktop + mobile drawer) ────────────────────

interface SidebarInnerProps {
  user:                AuthUser | null;
  pathname:            string;
  isVerifiedRecruiter: boolean;
  onNavClick?:         () => void;
  onLogout:            () => void;
}

function SidebarInner({
  user,
  pathname,
  isVerifiedRecruiter,
  onNavClick,
  onLogout,
}: SidebarInnerProps) {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "R";

  function isActive(href: string) {
    if (href === "/recruiter/dashboard") return pathname === href;
    if (href === "/recruiter/jobs")
      return (
        pathname === "/recruiter/jobs" ||
        (pathname.startsWith("/recruiter/jobs/") && pathname !== "/recruiter/jobs/new")
      );
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <Link to="/recruiter/dashboard" onClick={onNavClick} className="flex items-center">
          <BrandLogo />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}

        <div className="h-px bg-border mt-3 mb-3" />

        {/* Post a Job — locked until verified */}
        {isVerifiedRecruiter ? (
          <Link
            to="/recruiter/jobs/new"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/recruiter/jobs/new"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            Post a Job
          </Link>
        ) : (
          <Link
            to="/recruiter/profile"
            onClick={onNavClick}
            title="Upload verification documents to unlock job posting"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/40 hover:bg-accent/40 hover:text-muted-foreground transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Post a Job
            <span className="ml-auto text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
              verify first
            </span>
          </Link>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {/* AuthContext.tsx uses "avatar" — not "avatar_url" */}
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-sm font-bold">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name ?? "Recruiter"}</p>
            {/* AuthContext.tsx uses "verificationStatus" — not "verification_status" */}
            <VerificationBadge status={user?.verificationStatus} />
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

// ── RecruiterLayout ───────────────────────────────────────────────────────────

const RecruiterLayout = () => {
  const { user, logout, isVerifiedRecruiter } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarProps: SidebarInnerProps = {
    user,
    pathname:            location.pathname,
    isVerifiedRecruiter,
    onLogout:            handleLogout,
  };

  return (
    <>
      {/* Mobile: fixed top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 px-4 border-b bg-card/95 backdrop-blur-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 -ml-1 rounded-md hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/recruiter/dashboard" className="flex items-center">
          <BrandLogo />
        </Link>
      </header>

      {/* Mobile: slide-in drawer */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-3.5 right-3 p-1.5 rounded-md hover:bg-accent transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarInner {...sidebarProps} onNavClick={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Desktop + page shell */}
      <div className="flex">
        <aside className="hidden md:sticky md:top-0 md:flex md:h-screen w-64 flex-col border-r bg-card shrink-0 overflow-y-auto">
          <SidebarInner {...sidebarProps} />
        </aside>

        {/* pt-14 offsets the mobile fixed header */}
        <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default RecruiterLayout;