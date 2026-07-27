// src/pages/recruiter/RecruiterAnalytics.tsx
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, TrendingUp, BarChart3, Clock, Users, Loader2,
  Download, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface AnalyticsData {
  funnel: Array<{ stage: string; count: number }>;
  dailyApps: Array<{ date: string; count: number }>;
  topJobs: Array<{ id: number; title: string; applications: number; views: number }>;
  timeToHire: { avg_days: number | null };
}

const STAGE_COLORS: Record<string, string> = {
  applied:   "#3b82f6",
  screening: "#eab308",
  interview: "#a855f7",
  offer:     "#f97316",
  hired:     "#22c55e",
  rejected:  "#ef4444",
};

const STAGE_ORDER = ["applied", "screening", "interview", "offer", "hired", "rejected"];

function FunnelChart({ data }: { data: AnalyticsData["funnel"] }) {
  const ordered = STAGE_ORDER
    .map((s) => data.find((d) => d.stage === s) || { stage: s, count: 0 })
    .filter((d) => d.stage !== "rejected");

  const max = Math.max(...ordered.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {ordered.map((item, i) => {
        const pct = Math.round((item.count / max) * 100);
        const label = item.stage.charAt(0).toUpperCase() + item.stage.slice(1);
        const convRate = i > 0 && ordered[i - 1].count > 0
          ? Math.round((item.count / ordered[i - 1].count) * 100)
          : null;
        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{label}</span>
              <div className="flex items-center gap-3">
                {convRate !== null && (
                  <span className="text-muted-foreground">{convRate}% conversion</span>
                )}
                <span className="font-semibold">{item.count}</span>
              </div>
            </div>
            <div className="h-7 bg-muted rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: STAGE_COLORS[item.stage] || "#888",
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data }: { data: AnalyticsData["dailyApps"] }) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No data for this period
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 600, H = 160, PAD = { t: 10, r: 10, b: 30, l: 32 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const pts = data.map((d, i) => ({
    x: PAD.l + (i / Math.max(data.length - 1, 1)) * chartW,
    y: PAD.t + chartH - (d.count / max) * chartH,
    count: d.count,
    date: d.date,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${PAD.l},${H - PAD.b} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${W - PAD.r},${H - PAD.b} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.t + chartH - t * chartH,
    val: Math.round(t * max),
  }));

  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d) => {
      const idx = data.indexOf(d);
      return { x: PAD.l + (idx / Math.max(data.length - 1, 1)) * chartW, label: d.date.slice(5) };
    });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      {yTicks.map((t) => (
        <g key={t.val}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="currentColor" strokeOpacity="0.08" />
          <text x={PAD.l - 4} y={t.y + 3.5} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
            {t.val}
          </text>
        </g>
      ))}
      <polyline points={polyline} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 6} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">
          {l.label}
        </text>
      ))}
    </svg>
  );
}

function TopJobsTable({ jobs }: { jobs: AnalyticsData["topJobs"] }) {
  if (!jobs.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">No jobs posted yet</p>;
  }
  const maxApps = Math.max(...jobs.map((j) => j.applications), 1);
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Link to={`/recruiter/jobs/${job.id}`} className="font-medium hover:underline truncate max-w-[60%]">
              {job.title}
            </Link>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-muted-foreground">{job.views} views</span>
              <span className="font-semibold">{job.applications} apps</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/70 rounded-full"
              style={{ width: `${Math.round((job.applications / maxApps) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecruiterAnalytics() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/analytics?days=${days}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { navigate("/login"); return; }
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [days, navigate, token]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const totalApps = data?.funnel.reduce((s, f) => s + f.count, 0) ?? 0;
  const hired     = data?.funnel.find((f) => f.stage === "hired")?.count ?? 0;
  const offerRate = totalApps > 0 ? Math.round((hired / totalApps) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/recruiter/dashboard"><ChevronLeft className="w-4 h-4" /></Link>
            </Button>
            <h1 className="font-semibold">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total applications",  value: totalApps,                       icon: Users },
                { label: "Hired",               value: hired,                           icon: Users },
                { label: "Hire rate",           value: `${offerRate}%`,                 icon: TrendingUp },
                { label: "Avg. days to hire",   value: data?.timeToHire?.avg_days != null ? `${data.timeToHire.avg_days}d` : "—", icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-none">{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Daily applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart data={data?.dailyApps ?? []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Hiring funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FunnelChart data={data?.funnel ?? []} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Top performing jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopJobsTable jobs={data?.topJobs ?? []} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}