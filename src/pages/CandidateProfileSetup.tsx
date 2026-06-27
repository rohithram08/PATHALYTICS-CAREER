// src/pages/CandidateProfileSetup.tsx
//
// Student-facing page where job-seekers fill in the information
// recruiters see when browsing candidates or running job-match searches.
// The is_visible_to_recruiters toggle gives students explicit control
// over whether they appear in recruiter search results at all.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2, Plus, X, Eye, EyeOff, CheckCircle2,
  Linkedin, Github, Globe, Briefcase, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EXPERIENCE_OPTIONS = [
  "0–1 years", "1–2 years", "2–3 years", "3–5 years", "5–8 years", "8+ years",
];

const NOTICE_OPTIONS = [
  "Immediately available", "2 weeks", "1 month", "2 months", "3 months",
];

interface ProfileForm {
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  yearsOfExperience: string;
  currentRole: string;
  currentCompany: string;
  expectedSalary: string;
  noticePeriod: string;
  skills: string[];
  isVisibleToRecruiters: boolean;
}

const empty: ProfileForm = {
  fullName: "", phone: "", location: "",
  linkedinUrl: "", githubUrl: "", portfolioUrl: "",
  yearsOfExperience: "", currentRole: "", currentCompany: "",
  expectedSalary: "", noticePeriod: "",
  skills: [], isVisibleToRecruiters: false,
};

const CandidateProfileSetup = () => {
  const { token } = useAuth();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const skillRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof ProfileForm, v: ProfileForm[typeof k]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ── Load existing profile ──────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me/candidate-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.exists) {
          setForm({
            fullName:             data.fullName ?? "",
            phone:                data.phone ?? "",
            location:             data.location ?? "",
            linkedinUrl:          data.linkedinUrl ?? "",
            githubUrl:            data.githubUrl ?? "",
            portfolioUrl:         data.portfolioUrl ?? "",
            yearsOfExperience:    data.yearsOfExperience ?? "",
            currentRole:          data.currentRole ?? "",
            currentCompany:       data.currentCompany ?? "",
            expectedSalary:       data.expectedSalary ?? "",
            noticePeriod:         data.noticePeriod ?? "",
            skills:               Array.isArray(data.skills) ? data.skills : [],
            isVisibleToRecruiters: !!data.isVisibleToRecruiters,
          });
        }
      } catch {
        toast.error("Could not load your profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // ── Skills tag input ───────────────────────────────────────
  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s) || form.skills.length >= 40) return;
    set("skills", [...form.skills, s]);
    setSkillInput("");
    skillRef.current?.focus();
  };

  const removeSkill = (s: string) =>
    set("skills", form.skills.filter((x) => x !== s));

  // ── Save ──────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me/candidate-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Profile saved — recruiters can now find you");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Career Profile</h1>
          <p className="text-muted-foreground mt-1">
            This is what recruiters see when they search for candidates.
            Your contact details are never shared until you apply to a job.
          </p>
        </div>

        {/* Visibility toggle — most important control, shown first */}
        <Card className={`p-4 mb-6 border-2 transition-colors ${
          form.isVisibleToRecruiters ? "border-emerald-400 bg-emerald-50/50" : "border-border"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {form.isVisibleToRecruiters
                ? <Eye className="w-5 h-5 text-emerald-600" />
                : <EyeOff className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="font-semibold">
                  {form.isVisibleToRecruiters ? "Visible to recruiters" : "Hidden from recruiters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {form.isVisibleToRecruiters
                    ? "Your profile appears in recruiter searches"
                    : "You won't appear in any recruiter search until you turn this on"}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isVisibleToRecruiters}
              onClick={() => set("isVisibleToRecruiters", !form.isVisibleToRecruiters)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isVisibleToRecruiters ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form.isVisibleToRecruiters ? "translate-x-6" : ""
              }`} />
            </button>
          </div>
        </Card>

        {/* Basic info */}
        <Card className="p-6 space-y-5 mb-5">
          <h2 className="font-semibold text-lg">Basic information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Rohith Ram" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Chennai, India" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current role</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" value={form.currentRole} onChange={(e) => set("currentRole", e.target.value)} placeholder="CS Final Year" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current company / college</Label>
              <Input value={form.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} placeholder="Peri Institute of Technology" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Experience</Label>
              <select
                value={form.yearsOfExperience}
                onChange={(e) => set("yearsOfExperience", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notice period</Label>
              <select
                value={form.noticePeriod}
                onChange={(e) => set("noticePeriod", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {NOTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected salary (annual, ₹)</Label>
            <Input value={form.expectedSalary} onChange={(e) => set("expectedSalary", e.target.value)} placeholder="e.g. ₹5,00,000 – ₹7,00,000" />
          </div>
        </Card>

        {/* Skills — the most important field for matching */}
        <Card className="p-6 space-y-4 mb-5">
          <div>
            <h2 className="font-semibold text-lg">Skills</h2>
            <p className="text-sm text-muted-foreground">
              These are matched against job descriptions to rank you in recruiter searches.
              Add up to 40.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              ref={skillRef}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Type a skill and press Enter (e.g. React, Python, SQL)"
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-sm">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Links */}
        <Card className="p-6 space-y-4 mb-8">
          <h2 className="font-semibold text-lg">Links</h2>

          {[
            { key: "linkedinUrl", icon: Linkedin, placeholder: "https://linkedin.com/in/yourname", label: "LinkedIn" },
            { key: "githubUrl",   icon: Github,   placeholder: "https://github.com/yourname",    label: "GitHub" },
            { key: "portfolioUrl",icon: Globe,    placeholder: "https://yoursite.com",            label: "Portfolio / website" },
          ].map(({ key, icon: Icon, placeholder, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={placeholder}
                  value={form[key as keyof ProfileForm] as string}
                  onChange={(e) => set(key as keyof ProfileForm, e.target.value)}
                />
              </div>
            </div>
          ))}
        </Card>

        <Button className="w-full h-12 text-base gap-2" onClick={save} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            : <><CheckCircle2 className="w-4 h-4" />Save Career Profile</>}
        </Button>
      </motion.div>
    </div>
  );
};

export default CandidateProfileSetup;