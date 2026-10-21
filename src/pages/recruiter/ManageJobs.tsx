// src/pages/recruiter/ManageJobs.tsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Users, ExternalLink, Edit2, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { recruiterApi, ApiError, type RecruiterJobSummary as Job } from "@/lib/api";

const StatusBadge = ({ status }: { status: Job["status"] }) => {
  const map = {
    published: { label: "Published", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
    draft: { label: "Draft", icon: Clock, className: "bg-yellow-100 text-yellow-700" },
    closed: { label: "Closed", icon: XCircle, className: "bg-gray-100 text-gray-600" },
  };
  const { label, icon: Icon, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const ManageJobs = () => {
  const { isVerifiedRecruiter } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await recruiterApi.jobs.mine());
    } catch {
      toast.error("Could not load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const publish = async (id: number) => {
    setActioning(id);
    try {
      await recruiterApi.jobs.publish(id);
      toast.success("Job published");
      await loadJobs();
    } catch (err: unknown) {
      toast.error((err instanceof ApiError || err instanceof Error ? err.message : "An error occurred") || "Could not publish");
    } finally {
      setActioning(null);
    }
  };

  const close = async (id: number) => {
    setActioning(id);
    try {
      await recruiterApi.jobs.close(id);
      toast.success("Job closed");
      await loadJobs();
    } catch {
      toast.error("Could not close job");
    } finally {
      setActioning(null);
    }
  };

  const deleteJob = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this job listing? Applications and pipeline stages associated with it will also be removed.")) {
      return;
    }
    setActioning(id);
    try {
      await recruiterApi.jobs.delete(id);
      toast.success("Job deleted successfully");
      await loadJobs();
    } catch {
      toast.error("Could not delete job");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button asChild>
          <Link to="/recruiter/jobs/new">
            <Plus className="w-4 h-4 mr-2" />
            Post a job
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No jobs yet. Post your first listing!</p>
          <Button asChild>
            <Link to="/recruiter/jobs/new"><Plus className="w-4 h-4 mr-2" />Post a job</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold truncate">{job.title}</span>
                    <StatusBadge status={job.status} />
                    {job.application_mode === "external" && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink className="w-3 h-3" /> External
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {job.location} · {job.job_type}
                    {job.published_at && ` · Published ${new Date(job.published_at).toLocaleDateString()}`}
                  </p>
                </div>

                {job.status === "published" && (
                  <Link to={`/recruiter/jobs/${job.id}/applications`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline shrink-0">
                    <Users className="w-4 h-4" />
                    {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
                  </Link>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "draft" && isVerifiedRecruiter && (
                    <Button size="sm" variant="outline"
                      onClick={() => publish(job.id)}
                      disabled={actioning === job.id}>
                      Publish
                    </Button>
                  )}
                  {job.status === "published" && (
                    <Button size="sm" variant="outline"
                      onClick={() => close(job.id)}
                      disabled={actioning === job.id}>
                      Close
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild title="Edit job">
                    <Link to={`/recruiter/jobs/${job.id}/edit`}>
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteJob(job.id)}
                    disabled={actioning === job.id}
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageJobs;