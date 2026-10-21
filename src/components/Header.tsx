// src/components/Header.tsx
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  ChevronDown,
  LogOut,
  User,
  Settings,
  BookmarkCheck,
  LayoutDashboard,
  Sparkles,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Newspaper,
  Bot,
  Map,
  Info,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import favicon from "@/public/favicon.svg";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const userName = user?.name || "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const publicLinks = [
    { label: "Blog", href: "/blog", icon: Newspaper },
    { label: "Career Tips", href: "/career-tips", icon: Lightbulb },
    { label: "Industry Insights", href: "/industry-insights", icon: GraduationCap },
    { label: "Jobs", href: "/jobs", icon: Briefcase },
    { label: "About", href: "/about", icon: Info },
  ];

  const protectedLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Careers", href: "/career-recommendation", icon: Sparkles },
    { label: "Roadmaps", href: "/roadmaps", icon: Map },
    { label: "AI Chat", href: "/chatbot", icon: Bot },
    { label: "Resume", href: "/resume-builder", icon: FileText },
    { label: "Jobs", href: "/jobs", icon: Briefcase },
    { label: "Saved", href: "/saved-careers", icon: BookmarkCheck },
  ];

  const navLinks = isAuthenticated ? protectedLinks : publicLinks;
  const isActive = (href: string) => location.pathname === href;

  const Logo = () => (
    <>
      <img src="/favicon.svg" alt="Pathalytics Logo" className="w-8 h-8 object-cover rounded-full" />
      <span className="text-base font-bold tracking-tight">
        Path<span className="gradient-text">alytics</span>
      </span>
    </>
  );

  if (isLoading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Logo />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2 shrink-0"
          >
            <Logo />
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            {isAuthenticated && user ? (
              /* ── User Dropdown ── */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3 h-9">
                    <Avatar className="w-7 h-7">
                      {user.avatar && <AvatarImage src={user.avatar} alt={userName} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {userName.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 rounded-xl shadow-lg border border-border p-1"
                >
                  {/* User info */}
                  <div className="px-3 py-2.5 mb-1 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                  </div>

                  {/* Nav items */}
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <User className="w-4 h-4 text-muted-foreground" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/saved-careers")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <BookmarkCheck className="w-4 h-4 text-muted-foreground" /> Saved Careers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/resume-builder")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Resume Builder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <Settings className="w-4 h-4 text-muted-foreground" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/about")} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                    <Info className="w-4 h-4 text-muted-foreground" /> About Us
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* ── Guest Buttons ── */
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate("/signup")}>
                  Get Started
                </Button>
              </div>
            )}

            {/* ── Mobile Menu ── */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">

                  {/* Mobile header */}
                  <div className="flex items-center gap-2 p-4 border-b border-border">
                    <Link to="/" className="flex items-center gap-2">
                      <Logo />
                    </Link>
                  </div>

                  {/* Mobile nav links */}
                  <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive(link.href)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <link.icon className="w-4 h-4 shrink-0" />
                        {link.label}
                      </Link>
                    ))}

                    {/* Extra links for authenticated users */}
                    {isAuthenticated && (
                      <div className="pt-2 mt-1 border-t border-border space-y-0.5">
                        {[
                          { label: "Blog", href: "/blog", icon: Newspaper },
                          { label: "Career Tips", href: "/career-tips", icon: Lightbulb },
                          { label: "Industry Insights", href: "/industry-insights", icon: GraduationCap },
                          { label: "About Us", href: "/about", icon: Info },
                        ].map((link) => (
                          <Link
                            key={link.href}
                            to={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                              isActive(link.href)
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            <link.icon className="w-4 h-4 shrink-0" />
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </nav>

                  {/* Mobile footer actions */}
                  <div className="p-3 border-t border-border space-y-1">
                    {isAuthenticated ? (
                      <>
                        {/* Mini user info */}
                        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 bg-muted/40 rounded-xl">
                          <Avatar className="w-8 h-8 shrink-0">
                            {user?.avatar && <AvatarImage src={user.avatar} alt={userName} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <User className="w-4 h-4" /> Profile
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 px-3"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-4 h-4 mr-3" /> Log out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                          Log in
                        </Button>
                        <Button className="w-full" onClick={() => navigate("/signup")}>
                          Get Started
                        </Button>
                      </>
                    )}
                  </div>

                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;