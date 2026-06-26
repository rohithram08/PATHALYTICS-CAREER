// src/pages/recruiter/PostJob.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, ArrowRight, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STAGE_TYPES = [
  { value: "screening",     label: "Resume Screening" },
  { value: "aptitude_test", label: "Aptitude Test" },
  { value: "interview",     label: "Interview" },
  { value: "assignment",    label: "Assignment" },
  { value: "offer",         label: "Offer" },
  { value: "custom",        label: "Custom" },
];

// FIX: added _key so AnimatePresence can uniquely identify each stage.
// Using array index as key means removing stage B from [A, B, C] shifts
// indices, and AnimatePresence animates the wrong item out.
// _key is stable for the lifetime of the component; stripped before sending
// to the backend.
interface Stage {
  _key: string;
  stageName: string;
  stageType: string;
}

const emptyJob = {
  title: "", description: "", location: "", jobType: "full-time",
  salaryMin: "", salaryMax: "", applicationMode: "internal", externalApplyUrl: "",
};

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const PostJob = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [job, setJob] = useState(emptyJob);
  const [stages, setStages] = useState<Stage[]>([
    { _key: makeKey(), stageName: "Resume Screening",  stageType: "screening" },
    { _key: makeKey(), stageName: "Technical Interview", stageType: "interview" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => {
    setJob((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!job.title.trim()) e.title = "Title is required";
    if (!job.description.trim() || job.description.length < 20)
      e.description = "Description must be at least 20 characters";
    if (!job.location.trim()) e.location = "Location is required";
    if (job.applicationMode === "external" && !job.externalApplyUrl.trim())
      e.externalApplyUrl = "Paste the external application URL";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveJobAndProceed = async () => {
    if (!validateStep1()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...job,
          salaryMin: job.salaryMin ? Number(job.salaryMin) : undefined,
          salaryMax: job.salaryMax ? Number(job.salaryMax) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setJobId(data.id);
      setStep(2);
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "An error occurred") || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  const addStage = () =>
    setStages((p) => [...p, { _key: makeKey(), stageName: "", stageType: "custom" }]);

  const removeStage = (key: string) =>
    setStages((p) => p.filter((s) => s._key !== key));

  const updateStage = (key: string, field: "stageName" | "stageType", value: string) =>
    setStages((p) => p.map((s) => (s._key === key ? { ...s, [field]: value } : s)));

  // Strip _key before sending to backend
  const stagesPayload = () =>
    stages.map(({ stageName, stageType }) => ({ stageName, stageType }));

  const publish = async () => {
    if (stages.some((s) => !s.stageName.trim())) {
      toast.error("Give every stage a name before publishing");
      return;
    }
    setPublishing(true);
    try {
      const stageRes = await fetch(`${API_URL}/api/jobs/${jobId}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(stagesPayload()),
      });
      if (!stageRes.ok) throw new Error((await stageRes.json()).message);

      const pubRes = await fetch(`${API_URL}/api/jobs/${jobId}/publish`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pubRes.ok) throw new Error((await pubRes.json()).message);

      toast.success("Job published! Candidates can now apply.");
      navigate("/recruiter/jobs");
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "An error occurred") || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const saveDraft = async () => {
    if (!jobId) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/jobs/${jobId}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(stagesPayload()),
      });
      toast.success("Saved as draft");
      navigate("/recruiter/jobs");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Post a new job</h1>
        <p className="text-muted-foreground mb-8">
          Step {step} of 2 — {step === 1 ? "Job details" : "Pipeline stages"}
        </p>

        {/* Step 1 — job details */}
        {step === 1 && (
          <Card className="p-6 space-y-5">
            <div className="space-y-2">
              <Label>Job title *</Label>
              <Input placeholder="e.g. Frontend Engineer" value={job.title}
                onChange={(e) => set("title", e.target.value)}
                className={errors.title ? "border-destructive" : ""} />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                rows={6}
                placeholder="Describe the role, responsibilities, and requirements..."
                value={job.description}
                onChange={(e) => set("description", e.target.value)}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.description ? "border-destructive" : ""}`}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input placeholder="e.g. Chennai / Remote" value={job.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={errors.location ? "border-destructive" : ""} />
                {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label>Job type</Label>
                <Select value={job.jobType} onValueChange={(v) => set("jobType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["full-time", "part-time", "internship", "contract"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min salary (₹)</Label>
                <Input type="number" placeholder="e.g. 400000" value={job.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max salary (₹)</Label>
                <Input type="number" placeholder="e.g. 800000" value={job.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Application mode</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "internal", label: "Easy Apply (on-platform)" },
                  { v: "external", label: "External ATS / website" },
                ].map(({ v, label }) => (
                  <button key={v} type="button" onClick={() => set("applicationMode", v)}
                    className={`h-11 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${job.applicationMode === v ? "border-primary bg-primary/5 text-primary" : "border-input hover:bg-accent"}`}>
                    {v === "external" && <ExternalLink className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
              {job.applicationMode === "external" && (
                <div className="space-y-1 mt-2">
                  <Input placeholder="https://careers.yourcompany.com/jobs/..." value={job.externalApplyUrl}
                    onChange={(e) => set("externalApplyUrl", e.target.value)}
                    className={errors.externalApplyUrl ? "border-destructive" : ""} />
                  {errors.externalApplyUrl && (
                    <p className="text-xs text-destructive">{errors.externalApplyUrl}</p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full h-11" onClick={saveJobAndProceed} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Continue to pipeline stages
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 2 — pipeline stages */}
        {step === 2 && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Build your hiring pipeline</h2>
              <p className="text-sm text-muted-foreground">
                Add as many stages as you need. Candidates move through these in order.
              </p>
            </div>

            <AnimatePresence>
              {stages.map((stage, i) => (
                // FIX: use stage._key instead of index `i` as the key.
                // AnimatePresence needs a stable key to know which item
                // was removed so it can play the exit animation on the
                // correct element.
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
                      onChange={(e) => updateStage(stage._key, "stageName", e.target.value)}
                    />
                    <Select
                      value={stage.stageType}
                      onValueChange={(v) => updateStage(stage._key, "stageType", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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

            <Button variant="outline" type="button" onClick={addStage} className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" />
              Add stage
            </Button>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button variant="outline" onClick={saveDraft} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save as draft
              </Button>
              <Button onClick={publish} disabled={publishing} className="flex-1">
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Publish job
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default PostJob;