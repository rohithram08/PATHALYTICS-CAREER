// src/pages/recruiter/EditJob.tsx
//
// Edit an existing job's details and pipeline stages.
// Assumes two backend endpoints that follow the same patterns as the rest of the codebase:
//   GET  /api/jobs/:id       — returns the job (must be owned by the recruiter)
//   PATCH /api/jobs/:id      — updates job fields (title, description, location, …)
//   GET  /api/jobs/:id/stages — already used by ApplicationsReview
//   PUT  /api/jobs/:id/stages — already used by PostJob

import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { recruiterApi, ApiError, type RecruiterJobStageInput } from "@/lib/api";

const STAGE_TYPES = [
  { value: "screening",     label: "Resume Screening" },
  { value: "aptitude_test", label: "Aptitude Test" },
  { value: "interview",     label: "Interview" },
  { value: "assignment",    label: "Assignment" },
  { value: "offer",         label: "Offer" },
  { value: "custom",        label: "Custom" },
];

// Each stage gets a stable _key so AnimatePresence can identify
// which item to animate out when a stage is removed.
interface Stage {
  _key: string;
  stageName: string;
  stageType: string;
}

interface JobForm {
  title: string;
  description: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  skills: string;
  salaryMin: string;
  salaryMax: string;
  applicationMode: string;
  externalApplyUrl: string;
}

// ── Simple manual tab bar — avoids requiring shadcn Tabs to be installed ──
function TabBar({
  active,
  onChange,
}: {
  active: "details" | "pipeline";
  onChange: (t: "details" | "pipeline") => void;
}) {
  const base =
    "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none";
  const activeClass = "border-primary text-primary";
  const inactiveClass =
    "border-transparent text-muted-foreground hover:text-foreground hover:border-border";

  return (
    <div className="flex border-b mb-6">
      <button
        type="button"
        onClick={() => onChange("details")}
        className={`${base} ${active === "details" ? activeClass : inactiveClass}`}
      >
        Job Details
      </button>
      <button
        type="button"
        onClick={() => onChange("pipeline")}
        className={`${base} ${active === "pipeline" ? activeClass : inactiveClass}`}
      >
        Pipeline Stages
      </button>
    </div>
  );
}

const EditJob = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStages, setSavingStages] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "pipeline">("details");
  const [jobStatus, setJobStatus] = useState<"draft" | "published" | "closed">("draft");

  const [form, setForm] = useState<JobForm>({
    title: "",
    description: "",
    location: "",
    jobType: "full-time",
    experienceLevel: "any",
    skills: "",
    salaryMin: "",
    salaryMax: "",
    applicationMode: "internal",
    externalApplyUrl: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<Stage[]>([]);

  // ── Load job + stages on mount ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Fire both in parallel, but keep their error handling independent:
        // a stages failure is non-fatal (stages just stay empty), matching
        // the original Promise.all behavior where only jobRes.ok gated the
        // error path.
        const stagesPromise = recruiterApi.jobs.stages.get(jobId!).catch(() => null);
        const job = await recruiterApi.jobs.get(jobId!);

        let parsedSkills = "";
        if (Array.isArray(job.skills)) {
          parsedSkills = job.skills.join(", ");
        } else if (typeof job.skills === "string") {
          try {
            const arr = JSON.parse(job.skills);
            parsedSkills = Array.isArray(arr) ? arr.join(", ") : job.skills;
          } catch {
            parsedSkills = job.skills;
          }
        }

        setJobStatus(job.status);
        setForm({
          title: job.title || "",
          description: job.description || "",
          location: job.location || "",
          jobType: job.job_type || "full-time",
          experienceLevel: job.experience_level || "any",
          skills: parsedSkills,
          salaryMin: job.salary_min != null ? String(job.salary_min) : "",
          salaryMax: job.salary_max != null ? String(job.salary_max) : "",
          applicationMode: job.application_mode || "internal",
          externalApplyUrl: job.external_apply_url || "",
        });

        const raw = await stagesPromise;
        if (raw) {
          setStages(
            raw.map((s) => ({
              _key: String(s.id),
              stageName: s.stage_name,
              stageType: s.stage_type,
            }))
          );
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          toast.error("Job not found");
        } else if (err instanceof ApiError && err.status === 403) {
          toast.error("You don't have access to this job");
        } else {
          toast.error("Could not load job");
        }
        navigate("/recruiter/jobs");
        return;
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId, navigate]);

  // ── Details form helpers ─────────────────────────────────────────────
  const setField = (k: keyof JobForm, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim() || form.description.length < 20)
      e.description = "Description must be at least 20 characters";
    if (!form.location.trim()) e.location = "Location is required";
    if (form.applicationMode === "external" && !form.externalApplyUrl.trim())
      e.externalApplyUrl = "Paste the external application URL";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveDetails = async () => {
    if (!validateDetails()) return;
    setSavingDetails(true);
    try {
      const skillsArray = form.skills
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      await recruiterApi.jobs.update(jobId!, {
        title: form.title,
        description: form.description,
        location: form.location,
        jobType: form.jobType,
        experienceLevel: form.experienceLevel,
        skills: skillsArray,
        applicationMode: form.applicationMode,
        externalApplyUrl: form.externalApplyUrl || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      });
      toast.success("Job details saved");
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : undefined) || "Could not save job"
      );
    } finally {
      setSavingDetails(false);
    }
  };

  // ── Pipeline stage helpers ───────────────────────────────────────────
  const addStage = () =>
    setStages((p) => [
      ...p,
      {
        _key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        stageName: "",
        stageType: "custom",
      },
    ]);

  const removeStage = (key: string) =>
    setStages((p) => p.filter((s) => s._key !== key));

  const updateStage = (key: string, field: "stageName" | "stageType", value: string) =>
    setStages((p) =>
      p.map((s) => (s._key === key ? { ...s, [field]: value } : s))
    );

  const saveStages = async () => {
    if (stages.some((s) => !s.stageName.trim())) {
      toast.error("Every stage needs a name before saving");
      return;
    }
    setSavingStages(true);
    try {
      // Strip internal _key — backend only wants stageName + stageType
      const payload: RecruiterJobStageInput[] = stages.map(({ stageName, stageType }) => ({ stageName, stageType }));
      await recruiterApi.jobs.stages.update(jobId!, payload);
      toast.success("Pipeline stages updated");
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : undefined) || "Could not save stages"
      );
    } finally {
      setSavingStages(false);
    }
  };

  const handleDelete = async () => {
    if (!jobId) return;
    if (!window.confirm("Are you sure you want to delete this job listing? Applications and pipeline stages associated with it will also be removed.")) {
      return;
    }
    try {
      await recruiterApi.jobs.delete(jobId);
      toast.success("Job deleted successfully");
      navigate("/recruiter/jobs");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/recruiter/jobs">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Job</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Status:{" "}
                <span
                  className={
                    jobStatus === "published"
                      ? "text-emerald-600 font-medium"
                      : jobStatus === "closed"
                      ? "text-gray-500 font-medium"
                      : "text-yellow-600 font-medium"
                  }
                >
                  {jobStatus}
                </span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Job
          </Button>
        </div>

        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Details tab ──────────────────────────────────────────── */}
        {activeTab === "details" && (
          <Card className="p-6 space-y-5">
            <div className="space-y-2">
              <Label>Job title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                rows={6}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.description ? "border-destructive" : ""
                }`}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  className={errors.location ? "border-destructive" : ""}
                />
                {errors.location && (
                  <p className="text-xs text-destructive">{errors.location}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Job type</Label>
                <Select
                  value={form.jobType}
                  onValueChange={(v) => setField("jobType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["full-time", "part-time", "internship", "contract"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 400000"
                  value={form.salaryMin}
                  onChange={(e) => setField("salaryMin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 800000"
                  value={form.salaryMax}
                  onChange={(e) => setField("salaryMax", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <Select
                  value={form.experienceLevel}
                  onValueChange={(v) => setField("experienceLevel", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Experience</SelectItem>
                    <SelectItem value="entry">Entry Level (0-2 yrs)</SelectItem>
                    <SelectItem value="mid">Mid Level (3-5 yrs)</SelectItem>
                    <SelectItem value="senior">Senior (5-8 yrs)</SelectItem>
                    <SelectItem value="lead">Lead / Principal (8+ yrs)</SelectItem>
                    <SelectItem value="director">Director / Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <Input
                  placeholder="e.g. React, TypeScript, Node.js"
                  value={form.skills}
                  onChange={(e) => setField("skills", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Separate skills with commas</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Application mode</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "internal", label: "Easy Apply (on-platform)" },
                  { v: "external", label: "External ATS / website" },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setField("applicationMode", v)}
                    className={`h-11 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      form.applicationMode === v
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {v === "external" && <ExternalLink className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
              {form.applicationMode === "external" && (
                <div className="space-y-1 mt-2">
                  <Input
                    placeholder="https://careers.yourcompany.com/jobs/..."
                    value={form.externalApplyUrl}
                    onChange={(e) => setField("externalApplyUrl", e.target.value)}
                    className={errors.externalApplyUrl ? "border-destructive" : ""}
                  />
                  {errors.externalApplyUrl && (
                    <p className="text-xs text-destructive">
                      {errors.externalApplyUrl}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full h-11"
              onClick={saveDetails}
              disabled={savingDetails}
            >
              {savingDetails ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save job details
            </Button>
          </Card>
        )}

        {/* ── Pipeline tab ─────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Hiring pipeline</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add, rename, or remove stages. Changes apply going forward.
              </p>
            </div>

            {jobStatus === "published" && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                ⚠️ This job is live. Removing stages may affect candidates currently
                in review.
              </div>
            )}

            <AnimatePresence>
              {stages.map((stage, i) => (
                <motion.div
                  key={stage._key}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3"
                >
                  <GripVertical className="w-4 h-4 mt-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder={`Stage ${i + 1} name`}
                      value={stage.stageName}
                      onChange={(e) =>
                        updateStage(stage._key, "stageName", e.target.value)
                      }
                    />
                    <Select
                      value={stage.stageType}
                      onValueChange={(v) =>
                        updateStage(stage._key, "stageType", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(stage._key)}
                      className="mt-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <Button
              variant="outline"
              type="button"
              onClick={addStage}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add stage
            </Button>

            <Button
              className="w-full h-11"
              onClick={saveStages}
              disabled={savingStages}
            >
              {savingStages ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Save pipeline stages
            </Button>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default EditJob;