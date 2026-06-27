// src/pages/recruiter/RecruiterDashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Users, CheckCircle2, Clock, Plus, AlertCircle, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Job {
  id: number;
  title: string;
  location: string;
  job_type: string;
  status: "draft" | "published" | "closed";
  application_mode: "internal" | "external";
  applicant_count: number;
  created_at: string;
  published_at: string | null;
}

const statusColor: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-600",
};

const RecruiterDashboard = () => {
  const { token, user, isVerifiedRecruiter } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/jobs/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load jobs");
        setJobs(await res.json());
      } catch {
        toast.error("Could not load your jobs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const published = jobs.filter((j) => j.status === "published");
  const drafts = jobs.filter((j) => j.status === "draft");
  const totalApplicants = jobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0);

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
          </div>
          {isVerifiedRecruiter ? (
            <Button asChild>
              <Link to="/recruiter/jobs/new">
                <Plus className="w-4 h-4 mr-2" />
                Post a Job
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/recruiter/profile">
                <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                Complete Verification
              </Link>
            </Button>
          )}
        </div>

        {/* Verification Banner */}
        {!isVerifiedRecruiter && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-300 bg-yellow-50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800">Account pending verification</p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Upload your company verification documents to start publishing jobs.
                You can still create drafts in the meantime.
              </p>
              <Button size="sm" variant="outline" asChild className="mt-2">
                <Link to="/recruiter/profile">Upload documents</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Published jobs", value: published.length, icon: Briefcase, color: "text-emerald-600" },
            { label: "Draft jobs", value: drafts.length, icon: Clock, color: "text-yellow-600" },
            { label: "Total applicants", value: totalApplicants, icon: Users, color: "text-blue-600" },
            { label: "Active listings", value: published.length, icon: TrendingUp, color: "text-purple-600" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Button variant="outline" asChild className="h-11">
            <Link to="/recruiter/candidates">
              <Search className="w-4 h-4 mr-2" />
              Browse Candidates
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-11">
            <Link to="/recruiter/jobs">
              <Briefcase className="w-4 h-4 mr-2" />
              Manage Jobs
            </Link>
          </Button>
        </div>

        {/* Job listings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Jobs</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recruiter/jobs">Manage all</Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-10 text-center">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No jobs yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first job listing</p>
              <Button asChild>
                <Link to="/recruiter/jobs/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Post a job
                </Link>
              </Button>
            </Card>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <Card key={job.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{job.title}</h3>
                    <Badge className={`text-xs shrink-0 ${statusColor[job.status]}`}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {job.location} · {job.job_type}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">{job.applicant_count}</p>
                  <p className="text-xs text-muted-foreground">applicants</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/recruiter/jobs/${job.id}/applications`}>Review</Link>
                </Button>
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RecruiterDashboard;