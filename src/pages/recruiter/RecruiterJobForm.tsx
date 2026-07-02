// src/pages/recruiter/RecruiterJobForm.tsx  — FIXED
// Sends Authorization: Bearer header on every fetch

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Plus, X } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge }  from "@/components/ui/badge";
import { toast }  from "sonner";

const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "pathalytics_token";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const EMP_TYPES   = ["full-time", "part-time", "contract", "internship", "remote"] as const;
const EXP_LEVELS  = ["entry", "mid", "senior", "lead", "director"] as const;

interface FormState {
  title: string; description: string; location: string;
  salary_min: string; salary_max: string;
  employment_type: string; experience_level: string;
  deadline: string; is_active: boolean; skills: string[];
}

const DEFAULT: FormState = {
  title: "", description: "", location: "",
  salary_min: "", salary_max: "",
  employment_type: "", experience_level: "",
  deadline: "", is_active: true, skills: [],
};

export default function RecruiterJobForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm]           = useState<FormState>(DEFAULT);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading]     = useState(isEdit);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/recruiter/jobs/${id}`, {
          credentials: "include", headers: authHeaders(),
        });
        if (res.status === 401) { navigate("/login"); return; }
        if (!res.ok) throw new Error("Job not found");
        const job = await res.json();
        setForm({
          title: job.title || "", description: job.description || "",
          location: job.location || "",
          salary_min: job.salary_min ? String(job.salary_min) : "",
          salary_max: job.salary_max ? String(job.salary_max) : "",
          employment_type: job.employment_type || "",
          experience_level: job.experience_level || "",
          deadline: job.deadline ? job.deadline.slice(0, 10) : "",
          is_active: job.is_active !== 0,
          skills: Array.isArray(job.skills) ? job.skills : (job.skills ? JSON.parse(job.skills) : []),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load job");
        navigate("/recruiter/jobs");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s) || form.skills.length >= 20) return;
    setField("skills", [...form.skills, s]);
    setSkillInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required"); return;
    }
    const payload = {
      title: form.title.trim(), description: form.description.trim(),
      location: form.location.trim() || undefined,
      salary_min: form.salary_min ? Number(form.salary_min) : undefined,
      salary_max: form.salary_max ? Number(form.salary_max) : undefined,
      employment_type: form.employment_type || undefined,
      experience_level: form.experience_level || undefined,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      is_active: form.is_active, skills: form.skills,
    };
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `${API_BASE}/api/recruiter/jobs/${id}` : `${API_BASE}/api/recruiter/jobs`,
        {
          method: isEdit ? "PUT" : "POST",
          credentials: "include",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (res.status === 401) { navigate("/login"); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { message?: string }).message || "Failed to save");
      }
      toast.success(isEdit ? "Job updated" : "Job posted successfully");
      navigate("/recruiter/jobs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/recruiter/jobs"><ChevronLeft className="w-4 h-4" /></Link>
            </Button>
            <h1 className="font-semibold">{isEdit ? "Edit job" : "Post a new job"}</h1>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            {isEdit ? "Save changes" : "Publish job"}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="e.g. Senior Full Stack Engineer"
              value={form.title} onChange={(e) => setField("title", e.target.value)} maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" placeholder="Describe the role…"
              value={form.description} onChange={(e) => setField("description", e.target.value)}
              rows={8} maxLength={10000} className="resize-y" />
            <p className="text-xs text-muted-foreground text-right">{form.description.length}/10000</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Select value={form.employment_type} onValueChange={(v) => setField("employment_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {EMP_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Experience level</Label>
              <Select value={form.experience_level} onValueChange={(v) => setField("experience_level", v)}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {EXP_LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g. Bangalore, India or Remote"
              value={form.location} onChange={(e) => setField("location", e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salary_min">Salary min (₹/yr)</Label>
              <Input id="salary_min" type="number" placeholder="500000"
                value={form.salary_min} onChange={(e) => setField("salary_min", e.target.value)} min={0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary_max">Salary max (₹/yr)</Label>
              <Input id="salary_max" type="number" placeholder="1200000"
                value={form.salary_max} onChange={(e) => setField("salary_max", e.target.value)} min={0} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Required skills</Label>
            <div className="flex gap-2">
              <Input placeholder="e.g. React, Node.js" value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                maxLength={60} />
              <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button type="button" onClick={() => setField("skills", form.skills.filter((x) => x !== s))}
                      className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Application deadline</Label>
            <Input id="deadline" type="date" value={form.deadline}
              onChange={(e) => setField("deadline", e.target.value)}
              min={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Publish immediately</p>
              <p className="text-xs text-muted-foreground">Visible to candidates right away</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/recruiter/jobs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {isEdit ? "Save changes" : "Publish job"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}