// src/pages/recruiter/ApplicationsReview.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  recruiterApi,
  API_URL,
  type RecruiterApplicant as Applicant,
  type RecruiterJobStage as Stage,
} from "@/lib/api";

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
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [applicantsData, stagesData] = await Promise.all([
          recruiterApi.applications.byJob(jobId!),
          recruiterApi.jobs.stages.get(jobId!),
        ]);
        setApplicants(applicantsData);
        setStages(stagesData);
      } catch {
        toast.error("Could not load applicants");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  const update = async (appId: number, payload: { status?: string; stageId?: number }) => {
    setUpdating(appId);
    try {
      const data = await recruiterApi.applications.updateStatus(appId, payload);

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
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "An error occurred") || "Update failed");
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
                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      {app.resume_storage_key && (
                        <a
                          href={`${API_URL}/api/recruiter/resumes/${app.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          Download resume
                        </a>
                      )}
                      <Link
                        to={`/recruiter/candidates/${app.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        View Full Candidate Profile & Details
                      </Link>
                    </div>
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