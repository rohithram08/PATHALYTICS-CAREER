// src/pages/recruiter/ApplicationsReview.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Stage { id: number; stage_name: string; stage_type: string; }
interface Applicant {
  id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
  current_stage_id: number | null;
  current_stage_name: string | null;
  applied_at: string;
  resume_storage_key: string | null;
  cover_note: string | null;
}

const STATUS_OPTIONS = ["applied","in-review","interview","offer","rejected"];

const statusColor: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700",
  "in-review": "bg-yellow-100 text-yellow-700",
  interview: "bg-purple-100 text-purple-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

const ApplicationsReview = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { token } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch(`${API_URL}/api/applications/job/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/jobs/${jobId}/stages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!aRes.ok || !sRes.ok) throw new Error();
        setApplicants(await aRes.json());
        setStages(await sRes.json());
      } catch {
        toast.error("Could not load applicants");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId, token]);

  const update = async (appId: number, payload: { status?: string; stageId?: number }) => {
    setUpdating(appId);
    try {
      const res = await fetch(`${API_URL}/api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setApplicants((prev) =>
        prev.map((a) =>
          a.id !== appId ? a : {
            ...a,
            status: data.status,
            current_stage_id: payload.stageId ?? a.current_stage_id,
            current_stage_name: data.stageName ?? a.current_stage_name,
          }
        )
      );
      toast.success("Updated — candidate has been notified by email");
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/recruiter/jobs"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm">{applicants.length} applicant{applicants.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : applicants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No applications yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applicants.map((app, i) => (
            <motion.div key={app.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Card className="overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {app.candidate_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{app.candidate_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[app.status] || ""}`}>
                        {app.status}
                      </span>
                      {app.current_stage_name && (
                        <span className="text-xs text-muted-foreground">· {app.current_stage_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{app.candidate_email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Stage selector */}
                  {stages.length > 0 && (
                    <Select
                      value={app.current_stage_id ? String(app.current_stage_id) : ""}
                      onValueChange={(v) => update(app.id, { stageId: Number(v) })}
                      disabled={updating === app.id}>
                      <SelectTrigger className="w-44 h-9 text-xs">
                        <SelectValue placeholder="Move to stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.stage_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Status selector */}
                  <Select
                    value={app.status}
                    onValueChange={(v) => update(app.id, { status: v })}
                    disabled={updating === app.id || app.status === "withdrawn"}>
                    <SelectTrigger className="w-36 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Expand */}
                  <button type="button"
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className={`w-4 h-4 transition-transform ${expanded === app.id ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Expanded: cover note + resume */}
                {expanded === app.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t px-4 py-4 bg-muted/20 space-y-3">
                    {app.cover_note && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Cover note</p>
                        <p className="text-sm">{app.cover_note}</p>
                      </div>
                    )}
                    {app.resume_storage_key && (
                      <a
                        href={`${API_URL}/api/recruiter/resumes/${app.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        <FileText className="w-4 h-4" />
                        Download resume
                      </a>
                    )}
                    {!app.cover_note && !app.resume_storage_key && (
                      <p className="text-sm text-muted-foreground">No cover note or resume attached</p>
                    )}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationsReview;