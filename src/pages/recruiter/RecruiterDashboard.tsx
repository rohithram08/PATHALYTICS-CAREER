// src/pages/recruiter/RecruiterDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3, Users, Briefcase, TrendingUp, Plus, Eye, MessageSquare,
  CheckCircle, Clock, XCircle, ChevronRight, Bell, Search, Filter,
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, Star, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────
interface DashboardData {
  jobs: { total_jobs: number; active_jobs: number; closed_jobs: number };
  applications: {
    total_applications: number;
    screening: number;
    interviews: number;
    offers: number;
    hired: number;
    rejected: number;
  };
  views: { total_views: number };
  trend: Array<{ day: string; count: number }>;
  recent_applications: Array<{
    id: number;
    stage: string;
    created_at: string;
    candidate_name: string;
    candidate_email: string;
    job_title: string;
  }>;
}

const STAGE_COLORS: Record<string, string> = {
  applied:   "bg-blue-50 text-blue-700 border-blue-200",
  screening: "bg-yellow-50 text-yellow-700 border-yellow-200",
  interview: "bg-purple-50 text-purple-700 border-purple-200",
  offer:     "bg-orange-50 text-orange-700 border-orange-200",
  hired:     "bg-green-50 text-green-700 border-green-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
};

const STAGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  applied:   ({ className }) => <Clock className={className} />,
  screening: ({ className }) => <Eye className={className} />,
  interview: ({ className }) => <MessageSquare className={className} />,
  offer:     ({ className }) => <Star className={className} />,
  hired:     ({ className }) => <CheckCircle className={className} />,
  rejected:  ({ className }) => <XCircle className={className} />,
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function KPICard({
  label, value, sub, icon: Icon, trend, trendValue,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-xl p-2.5 bg-primary/8">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        {trend && trendValue && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium">
            {trend === "up"   ? <ArrowUpRight className="w-3 h-3 text-green-600" /> : null}
            {trend === "down" ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : null}
            <span className={trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data }: { data: Array<{ day: string; count: number }> }) {
  if (!data.length) return <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const last7 = data.slice(-14);
  return (
    <div className="h-16 flex items-end gap-0.5">
      {last7.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.day}: ${d.count}`}>
          <div
            className="w-full rounded-t-sm bg-primary/70 transition-all"
            style={{ height: `${Math.max(4, (d.count / max) * 60)}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function PipelineFunnel({ apps }: { apps: DashboardData["applications"] }) {
  const stages = [
    { key: "total_applications", label: "Applied",   color: "bg-blue-500" },
    { key: "screening",          label: "Screening", color: "bg-yellow-400" },
    { key: "interviews",         label: "Interview", color: "bg-purple-500" },
    { key: "offers",             label: "Offer",     color: "bg-orange-500" },
    { key: "hired",              label: "Hired",     color: "bg-green-500" },
  ] as const;

  const max = apps.total_applications || 1;

  return (
    <div className="space-y-2">
      {stages.map(({ key, label, color }) => {
        const val = apps[key] ?? 0;
        const pct = Math.round((val / max) * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${color} rounded transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold w-8 text-right">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function RecruiterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/dashboard`, {
        credentials: "include",
      });
      if (res.status === 401) { navigate("/login"); return; }
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = (data?.recent_applications || []).filter((a) =>
    !searchQ || a.candidate_name.toLowerCase().includes(searchQ.toLowerCase()) ||
    a.job_title.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg tracking-tight">Pathalytics</span>
            <Badge variant="secondary" className="text-[11px]">Recruiter</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recruiter/jobs">Jobs</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recruiter/candidates">Candidates</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recruiter/analytics">Analytics</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recruiter/messages">
                <MessageSquare className="w-4 h-4 mr-1" /> Messages
              </Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchDashboard}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" asChild>
              <Link to="/recruiter/jobs/new">
                <Plus className="w-3.5 h-3.5 mr-1" /> Post a Job
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Greeting ─────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
              {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here's what's happening with your hiring today
            </p>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Active Jobs"
            value={data?.jobs.active_jobs ?? 0}
            sub={`${data?.jobs.total_jobs ?? 0} total`}
            icon={Briefcase}
          />
          <KPICard
            label="Applications"
            value={data?.applications.total_applications ?? 0}
            sub={`${data?.applications.hired ?? 0} hired`}
            icon={Users}
            trend="up"
            trendValue="vs last month"
          />
          <KPICard
            label="In Interview"
            value={data?.applications.interviews ?? 0}
            sub={`${data?.applications.screening ?? 0} screening`}
            icon={MessageSquare}
          />
          <KPICard
            label="Job Views"
            value={data?.views.total_views ?? 0}
            sub="All postings combined"
            icon={Eye}
          />
        </div>

        {/* ── Charts row ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Applications — last 14 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={data?.trend ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Hiring pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineFunnel apps={data?.applications ?? {
                total_applications: 0, screening: 0, interviews: 0, offers: 0, hired: 0, rejected: 0
              }} />
            </CardContent>
          </Card>
        </div>

        {/* ── Recent applications ───────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Recent applications
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="pl-8 h-8 w-48 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/recruiter/candidates">
                    View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No applications yet. <Link to="/recruiter/jobs/new" className="text-primary underline-offset-4 hover:underline">Post a job</Link> to get started.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.slice(0, 10).map((app) => {
                  const Icon = STAGE_ICONS[app.stage] || Clock;
                  return (
                    <Link
                      key={app.id}
                      to={`/recruiter/candidates/${app.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {app.candidate_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.candidate_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.job_title}</p>
                      </div>

                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${STAGE_COLORS[app.stage] || ""}`}>
                        <Icon className="w-3 h-3" />
                        {app.stage.charAt(0).toUpperCase() + app.stage.slice(1)}
                      </span>

                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {formatDate(app.created_at)}
                      </span>

                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Quick actions ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/recruiter/jobs/new"
            className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Post a new job</p>
              <p className="text-xs text-muted-foreground">Reach 10k+ candidates</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            to="/recruiter/candidates"
            className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Browse candidates</p>
              <p className="text-xs text-muted-foreground">Search talent pool</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            to="/recruiter/analytics"
            className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">View analytics</p>
              <p className="text-xs text-muted-foreground">Funnel & trends</p>
            </div>
            <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </main>
    </div>
  );
}