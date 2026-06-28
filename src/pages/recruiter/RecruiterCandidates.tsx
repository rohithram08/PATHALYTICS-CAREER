// src/pages/recruiter/RecruiterCandidates.tsx
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Filter, ChevronLeft, Eye, MessageSquare, Star, CheckCircle,
  XCircle, Clock, Loader2, ArrowRight, LayoutList, Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { label: string; color: string; bg: string }> = {
  applied:   { label: "Applied",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  screening: { label: "Screening", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  interview: { label: "Interview", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  offer:     { label: "Offer",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  hired:     { label: "Hired",     color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  rejected:  { label: "Rejected",  color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

interface Candidate {
  application_id: number;
  user_id: number;
  name: string;
  email: string;
  avatar_url?: string;
  stage: Stage;
  applied_at: string;
  job_title: string;
  job_id: number;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Request failed");
  return res.json();
}

function CandidateCard({ candidate, onStatusChange }: {
  candidate: Candidate;
  onStatusChange: (id: number, stage: Stage) => void;
}) {
  const meta = STAGE_META[candidate.stage];
  const initials = candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-card rounded-lg border p-4 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {candidate.avatar_url ? (
          <img src={candidate.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{candidate.name}</p>
          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {candidate.job_title}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
            <Link to={`/recruiter/candidates/${candidate.application_id}`}>
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
            <Link to={`/recruiter/messages/compose?to=${candidate.user_id}`}>
              <MessageSquare className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ candidates, onStatusChange }: {
  candidates: Candidate[];
  onStatusChange: (id: number, stage: Stage) => void;
}) {
  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = candidates.filter((c) => c.stage === s);
    return acc;
  }, {} as Record<Stage, Candidate[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
      {STAGES.filter((s) => s !== "rejected").map((stage) => {
        const meta = STAGE_META[stage];
        const items = byStage[stage] || [];
        return (
          <div key={stage} className="flex-none w-64">
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 ${meta.bg}`}>
              <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
              <span className={`text-xs font-bold ${meta.color}`}>{items.length}</span>
            </div>
            <div className="border rounded-b-lg bg-muted/30 p-2 space-y-2 min-h-48">
              {items.map((c) => (
                <CandidateCard key={c.application_id} candidate={c} onStatusChange={onStatusChange} />
              ))}
              {items.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No candidates here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ candidates, onStatusChange }: {
  candidates: Candidate[];
  onStatusChange: (id: number, stage: Stage) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Candidate</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Job</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Applied</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {candidates.map((c) => {
            const meta = STAGE_META[c.stage];
            const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <tr key={c.application_id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[180px] truncate">
                  {c.job_title}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={c.stage}
                    onValueChange={(v) => onStatusChange(c.application_id, v as Stage)}
                  >
                    <SelectTrigger className={`h-6 w-28 text-[11px] border font-medium ${meta.bg} ${meta.color}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {STAGE_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {new Date(c.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <Link to={`/recruiter/candidates/${c.application_id}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                      <Link to={`/recruiter/messages/compose?to=${c.user_id}`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {candidates.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No candidates found
        </div>
      )}
    </div>
  );
}

export default function RecruiterCandidates() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<"list" | "kanban">("list");

  const q     = searchParams.get("q") || "";
  const stage = searchParams.get("stage") || "";
  const page  = Number(searchParams.get("page") || 1);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (q)     params.set("q", q);
      if (stage) params.set("stage", stage);
      const data = await apiFetch(`/api/recruiter/candidates?${params}`);
      setCandidates(data.candidates);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load candidates";
      if (msg.includes("401")) navigate("/login");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [q, stage, page, navigate]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleStatusChange = async (applicationId: number, newStage: Stage) => {
    try {
      await apiFetch(`/api/recruiter/candidates/${applicationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      setCandidates((prev) =>
        prev.map((c) =>
          c.application_id === applicationId ? { ...c, stage: newStage } : c
        )
      );
      toast.success(`Stage updated to ${STAGE_META[newStage].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stage");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/recruiter/dashboard"><ChevronLeft className="w-4 h-4" /></Link>
            </Button>
            <h1 className="font-semibold">Candidates</h1>
            {total > 0 && <Badge variant="secondary">{total}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => setView("list")}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={view === "kanban" ? "secondary" : "ghost"}
              onClick={() => setView("kanban")}
              title="Kanban view"
            >
              <Columns3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates…"
              value={q}
              onChange={(e) => setSearchParams({ q: e.target.value, stage })}
              className="pl-9"
            />
          </div>
          <Select
            value={stage || "all"}
            onValueChange={(v) => setSearchParams({ q, stage: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-36">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : view === "kanban" ? (
          <KanbanBoard candidates={candidates} onStatusChange={handleStatusChange} />
        ) : (
          <ListView candidates={candidates} onStatusChange={handleStatusChange} />
        )}

        {total > 30 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {Math.min((page - 1) * 30 + 1, total)}–{Math.min(page * 30, total)} of {total}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setSearchParams({ q, stage, page: String(page - 1) })}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * 30 >= total}
                onClick={() => setSearchParams({ q, stage, page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}