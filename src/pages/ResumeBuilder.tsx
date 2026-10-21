// src/pages/ResumeBuilder.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  Copy,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  CheckCircle2,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Code2,
  Award,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import {
  ResumeData,
  ResumeSettings,
  ResumeTemplateId,
  WorkExperienceItem,
  EducationItem,
  ProjectItem,
} from "@/components/resume/types";
import { SAMPLE_RESUME_DATA } from "@/components/resume/sampleResumeData";
import { analyzeResumeATS } from "@/components/resume/atsScorer";
import { ResumeTemplateRenderer } from "@/components/resume/ResumeTemplates";
import { AtsScoreCard } from "@/components/resume/AtsScoreCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const DEFAULT_SETTINGS: ResumeSettings = {
  template: "modern",
  withPhoto: true,
  photoShape: "rounded",
  accentColor: "#2563eb",
  fontSize: "base",
  spacing: "normal",
};

const EMPTY_RESUME: ResumeData = {
  personalInfo: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    photoUrl: "",
  },
  summary: "",
  skills: {
    technical: [],
    frameworks: [],
    tools: [],
    soft: [],
  },
  experience: [],
  education: [],
  projects: [],
  certifications: [],
};

const COLOR_OPTIONS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Emerald", value: "#059669" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Slate", value: "#334155" },
  { label: "Rose", value: "#e11d48" },
  { label: "Amber", value: "#d97706" },
];

export const ResumeBuilder: React.FC = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<ResumeData>(SAMPLE_RESUME_DATA);
  const [settings, setSettings] = useState<ResumeSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<"content" | "preview" | "audit">("content");
  const [previewZoom, setPreviewZoom] = useState<number>(75);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const storageKey = user?.id ? `pathalytics_resume_draft_${user.id}` : "pathalytics_resume_draft_guest";

  // Load saved draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData(parsed.data);
        if (parsed.settings) setSettings(parsed.settings);
      } else if (user) {
        // Pre-populate user name & email if starting empty
        setData((prev) => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: user.name || prev.personalInfo.fullName,
            email: user.email || prev.personalInfo.email,
            photoUrl: user.avatar || prev.personalInfo.photoUrl,
          },
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, [user, storageKey]);

  // Auto-save draft on changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ data, settings }));
    } catch {
      // Ignore quota errors
    }
  }, [data, settings, storageKey]);

  // ATS Real-time audit
  const auditResult = analyzeResumeATS(data, settings);

  // Import from Candidate Profile API
  const handleImportProfile = async () => {
    setIsImporting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me/candidate-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not fetch profile");
      const profile = await res.json();

      setData((prev) => ({
        ...prev,
        personalInfo: {
          fullName: profile.fullName || user?.name || prev.personalInfo.fullName,
          title: profile.currentRole || prev.personalInfo.title,
          email: user?.email || prev.personalInfo.email,
          phone: profile.phone || prev.personalInfo.phone,
          location: profile.location || prev.personalInfo.location,
          linkedin: profile.linkedinUrl || prev.personalInfo.linkedin,
          github: profile.githubUrl || prev.personalInfo.github,
          portfolio: profile.portfolioUrl || prev.personalInfo.portfolio,
          photoUrl: user?.avatar || prev.personalInfo.photoUrl,
        },
        skills: {
          ...prev.skills,
          technical: profile.skills && profile.skills.length > 0 ? profile.skills : prev.skills.technical,
        },
      }));
      toast.success("Profile data imported successfully!");
    } catch (err) {
      toast.error("Failed to import profile data. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrint = () => {
    toast.info("Opening print dialog — select 'Save as PDF' to download your resume file.", {
      duration: 3500,
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleCopyPlainText = () => {
    const text = [
      data.personalInfo.fullName.toUpperCase(),
      data.personalInfo.title,
      `${data.personalInfo.email} | ${data.personalInfo.phone} | ${data.personalInfo.location}`,
      data.personalInfo.linkedin ? `LinkedIn: ${data.personalInfo.linkedin}` : "",
      data.personalInfo.github ? `GitHub: ${data.personalInfo.github}` : "",
      "\nPROFESSIONAL SUMMARY\n" + data.summary,
      "\nWORK EXPERIENCE",
      ...data.experience.map(
        (e) => `${e.role} — ${e.company} (${e.startDate} - ${e.current ? "Present" : e.endDate})\n` +
          e.description.map((b) => `• ${b}`).join("\n")
      ),
      "\nEDUCATION",
      ...data.education.map((ed) => `${ed.degree} — ${ed.institution} (${ed.year}) ${ed.score || ""}`),
      "\nSKILLS\n" +
        [
          data.skills.technical.length ? `Languages: ${data.skills.technical.join(", ")}` : "",
          data.skills.frameworks.length ? `Frameworks: ${data.skills.frameworks.join(", ")}` : "",
          data.skills.tools.length ? `Tools: ${data.skills.tools.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Plain text resume copied to clipboard!");
  };

  // Helper updater
  const updatePersonalInfo = (field: keyof ResumeData["personalInfo"], value: string) => {
    setData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  // Experience handlers
  const addExperience = () => {
    const newItem: WorkExperienceItem = {
      id: `exp-${Date.now()}`,
      role: "Software Engineer",
      company: "Company Name",
      location: "City, Country",
      startDate: "2023-01",
      endDate: "Present",
      current: true,
      description: ["Spearheaded development of scalable features improving throughput by 30%."],
    };
    setData((p) => ({ ...p, experience: [newItem, ...p.experience] }));
  };

  const updateExperience = <K extends keyof WorkExperienceItem>(
    index: number,
    field: K,
    value: WorkExperienceItem[K]
  ) => {
    setData((p) => {
      const copy = [...p.experience];
      copy[index] = { ...copy[index], [field]: value };
      return { ...p, experience: copy };
    });
  };

  const removeExperience = (index: number) => {
    setData((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== index) }));
  };

  // Education handlers
  const addEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      degree: "B.S. in Computer Science",
      institution: "University Name",
      year: "2024",
      score: "GPA: 3.8",
    };
    setData((p) => ({ ...p, education: [...p.education, newItem] }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setData((p) => {
      const copy = [...p.education];
      copy[index] = { ...copy[index], [field]: value };
      return { ...p, education: copy };
    });
  };

  const removeEducation = (index: number) => {
    setData((p) => ({ ...p, education: p.education.filter((_, i) => i !== index) }));
  };

  // Projects handlers
  const addProject = () => {
    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: "Project Name",
      technologies: "React, Node.js, PostgreSQL",
      link: "https://github.com/...",
      bullets: ["Architected microservices handling 10,000 requests/minute with zero downtime."],
    };
    setData((p) => ({ ...p, projects: [...p.projects, newItem] }));
  };

  const updateProject = <K extends keyof ProjectItem>(
    index: number,
    field: K,
    value: ProjectItem[K]
  ) => {
    setData((p) => {
      const copy = [...p.projects];
      copy[index] = { ...copy[index], [field]: value };
      return { ...p, projects: copy };
    });
  };

  const removeProject = (index: number) => {
    setData((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }));
  };

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Hide all screen application chrome */
          .print\\:hidden,
          #screen-app-shell,
          header.fixed,
          footer,
          nav,
          aside,
          #sonner-toaster {
            display: none !important;
          }
          /* Dedicated print root */
          #print-root {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-root * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── Screen App UI (Hidden during print) ── */}
      <div id="screen-app-shell" className="print:hidden min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
        {/* Title & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">ATS Resume Builder</h1>
              <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <Sparkles className="w-3 h-3 mr-1" /> ATS Optimized
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Build and customize multiple ATS-friendly resume templates with live scoring and instant PDF export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportProfile}
              disabled={isImporting}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? "animate-spin" : ""}`} />
              Import Profile
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setData(SAMPLE_RESUME_DATA)}
              className="gap-1.5"
            >
              Load Sample
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPlainText}
              className="gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Plain Text
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Template & Visual Controls Toolbar */}
        <div className="my-6 bg-card border border-border rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Template Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" /> Template:
            </span>
            {(
              [
                { id: "modern", name: "Modern Professional" },
                { id: "harvard", name: "Harvard / Classic ATS" },
                { id: "executive", name: "Executive Sidebar" },
                { id: "minimalist", name: "Tech Minimalist" },
              ] as const
            ).map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={settings.template === t.id ? "default" : "outline"}
                onClick={() => setSettings((s) => ({ ...s, template: t.id }))}
                className="text-xs h-8"
              >
                {t.name}
              </Button>
            ))}
          </div>

          {/* Photo & Style Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* With Photo / Without Photo Switch */}
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/60">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="photo-toggle" className="text-xs font-medium cursor-pointer">
                {settings.withPhoto ? "With Photo" : "Without Photo"}
              </Label>
              <Switch
                id="photo-toggle"
                checked={settings.withPhoto}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, withPhoto: checked }))}
              />
            </div>

            {/* Accent Color picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Color:</span>
              <div className="flex items-center gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, accentColor: c.value }))}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      settings.accentColor === c.value ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher (Visible on small screens only) */}
        <div className="lg:hidden flex items-center justify-center p-1 bg-muted rounded-xl mb-4 border border-border">
          <button
            type="button"
            onClick={() => setMobileView("editor")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mobileView === "editor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ✏️ Content Editor
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mobileView === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            👁️ Live Preview &amp; Score
          </button>
        </div>

        {/* Main Grid: 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Editor Controls (6 cols) */}
          <div className={`space-y-4 lg:col-span-6 ${mobileView === "editor" ? "block" : "hidden lg:block"}`}>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid grid-cols-4 w-full mb-4">
                  <TabsTrigger value="personal" className="text-xs">Contact</TabsTrigger>
                  <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
                  <TabsTrigger value="education" className="text-xs">Education</TabsTrigger>
                  <TabsTrigger value="skills" className="text-xs">Skills & Proj</TabsTrigger>
                </TabsList>

                {/* 1. Personal Info */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Full Name</Label>
                      <Input
                        value={data.personalInfo.fullName}
                        onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
                        placeholder="e.g. Alex Rivera"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Target Title</Label>
                      <Input
                        value={data.personalInfo.title}
                        onChange={(e) => updatePersonalInfo("title", e.target.value)}
                        placeholder="e.g. Full-Stack Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={data.personalInfo.email}
                        onChange={(e) => updatePersonalInfo("email", e.target.value)}
                        placeholder="alex@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={data.personalInfo.phone}
                        onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Location</Label>
                      <Input
                        value={data.personalInfo.location}
                        onChange={(e) => updatePersonalInfo("location", e.target.value)}
                        placeholder="City, State / Remote"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">LinkedIn URL</Label>
                      <Input
                        value={data.personalInfo.linkedin}
                        onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">GitHub URL</Label>
                      <Input
                        value={data.personalInfo.github}
                        onChange={(e) => updatePersonalInfo("github", e.target.value)}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Portfolio / Website</Label>
                      <Input
                        value={data.personalInfo.portfolio}
                        onChange={(e) => updatePersonalInfo("portfolio", e.target.value)}
                        placeholder="https://mywebsite.com"
                      />
                    </div>
                  </div>

                  {settings.withPhoto && (
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-primary" /> Profile Photo URL
                        </Label>
                        <div className="flex items-center gap-1">
                          {(["circle", "rounded", "square"] as const).map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => setSettings((s) => ({ ...s, photoShape: shape }))}
                              className={`text-[10px] uppercase px-2 py-0.5 rounded border transition-colors ${
                                settings.photoShape === shape
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground"
                              }`}
                            >
                              {shape}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        value={data.personalInfo.photoUrl || ""}
                        onChange={(e) => updatePersonalInfo("photoUrl", e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                      />
                      {user?.avatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePersonalInfo("photoUrl", user.avatar || "")}
                          className="text-[11px] h-7 text-primary hover:text-primary"
                        >
                          Use my Pathalytics avatar
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">Professional Summary</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {data.summary.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <Textarea
                      rows={4}
                      value={data.summary}
                      onChange={(e) => setData((p) => ({ ...p, summary: e.target.value }))}
                      placeholder="Write a concise 30-75 word summary highlighting your core tech stack, years of experience, and quantifiable achievements..."
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </TabsContent>

                {/* 2. Experience */}
                <TabsContent value="experience" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Work Experience ({data.experience.length})</Label>
                    <Button size="sm" variant="outline" onClick={addExperience} className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Add Position
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {data.experience.map((exp, idx) => (
                      <div key={exp.id} className="p-3.5 bg-muted/30 rounded-xl border border-border/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Position #{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExperience(idx)}
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Job Title / Role"
                            value={exp.role}
                            onChange={(e) => updateExperience(idx, "role", e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            placeholder="Company Name"
                            value={exp.company}
                            onChange={(e) => updateExperience(idx, "company", e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            placeholder="Start (YYYY-MM)"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(idx, "startDate", e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            placeholder="End (YYYY-MM)"
                            disabled={exp.current}
                            value={exp.current ? "Present" : exp.endDate}
                            onChange={(e) => updateExperience(idx, "endDate", e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex items-center gap-2 px-1">
                            <Switch
                              id={`curr-${exp.id}`}
                              checked={exp.current}
                              onCheckedChange={(v) => updateExperience(idx, "current", v)}
                            />
                            <Label htmlFor={`curr-${exp.id}`} className="text-xs cursor-pointer">
                              Current Role
                            </Label>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Bullet Points (One per line — incorporate metrics &amp; action verbs):
                          </Label>
                          <Textarea
                            rows={3}
                            value={exp.description.join("\n")}
                            onChange={(e) => updateExperience(idx, "description", e.target.value.split("\n"))}
                            placeholder="• Spearheaded refactoring of REST API dropping latency by 45%..."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 3. Education */}
                <TabsContent value="education" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Education Credentials</Label>
                    <Button size="sm" variant="outline" onClick={addEducation} className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Add Degree
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {data.education.map((edu, idx) => (
                      <div key={edu.id} className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">Credential #{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(idx)}
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Degree (e.g. B.S. in Computer Science)"
                            value={edu.degree}
                            onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            placeholder="Institution (e.g. UC Berkeley)"
                            value={edu.institution}
                            onChange={(e) => updateEducation(idx, "institution", e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Graduation Year (e.g. 2024)"
                            value={edu.year}
                            onChange={(e) => updateEducation(idx, "year", e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            placeholder="GPA or Honors (e.g. GPA: 3.85 / 4.0)"
                            value={edu.score || ""}
                            onChange={(e) => updateEducation(idx, "score", e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 4. Skills & Projects */}
                <TabsContent value="skills" className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Technical Skills (Comma separated)</Label>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Programming Languages:</span>
                      <Input
                        value={data.skills.technical.join(", ")}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              technical: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            },
                          }))
                        }
                        placeholder="TypeScript, Python, Go, Java, SQL"
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Frameworks &amp; Libraries:</span>
                      <Input
                        value={data.skills.frameworks.join(", ")}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              frameworks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            },
                          }))
                        }
                        placeholder="React, Node.js, Express, Tailwind CSS, Next.js"
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Cloud, Databases &amp; Tools:</span>
                      <Input
                        value={data.skills.tools.join(", ")}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: {
                              ...p.skills,
                              tools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            },
                          }))
                        }
                        placeholder="PostgreSQL, Redis, Docker, AWS, Git, Kubernetes"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold">Key Projects ({data.projects.length})</Label>
                      <Button size="sm" variant="outline" onClick={addProject} className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Add Project
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {data.projects.map((proj, idx) => (
                        <div key={proj.id} className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">Project #{idx + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProject(idx)}
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              placeholder="Project Title"
                              value={proj.title}
                              onChange={(e) => updateProject(idx, "title", e.target.value)}
                              className="text-xs"
                            />
                            <Input
                              placeholder="Tech Stack (e.g. Go, Redis, Docker)"
                              value={proj.technologies}
                              onChange={(e) => updateProject(idx, "technologies", e.target.value)}
                              className="text-xs"
                            />
                          </div>

                          <Input
                            placeholder="Live Link or Repo (https://github.com/...)"
                            value={proj.link || ""}
                            onChange={(e) => updateProject(idx, "link", e.target.value)}
                            className="text-xs"
                          />

                          <Textarea
                            rows={2}
                            value={proj.bullets.join("\n")}
                            onChange={(e) => updateProject(idx, "bullets", e.target.value.split("\n"))}
                            placeholder="• Highlight your role, problem solved, and architecture..."
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column: Live A4 Preview & ATS Score Card (6 cols) */}
          <div className={`space-y-4 lg:col-span-6 ${mobileView === "preview" ? "block" : "hidden lg:block"}`}>
            {/* ATS Score Card */}
            <AtsScoreCard audit={auditResult} />

            {/* Preview Canvas Container */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-border rounded-xl p-4 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs text-muted-foreground">
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Eye className="w-3.5 h-3.5 text-primary" /> Live A4 Sheet Preview
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={previewZoom === 75 ? "secondary" : "ghost"}
                    onClick={() => setPreviewZoom(75)}
                    className="h-6 px-2 text-[11px]"
                  >
                    Fit
                  </Button>
                  <Button
                    size="sm"
                    variant={previewZoom === 100 ? "secondary" : "ghost"}
                    onClick={() => setPreviewZoom(100)}
                    className="h-6 px-2 text-[11px]"
                  >
                    100%
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                    className="h-6 w-6 p-0"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-[11px] font-mono min-w-[36px] text-center">{previewZoom}%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewZoom((z) => Math.min(130, z + 10))}
                    className="h-6 w-6 p-0"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Centered Scrollable scaled viewport */}
              <div className="overflow-auto max-h-[850px] rounded-lg border border-slate-300 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-950/60 p-4 flex justify-center items-start">
                <div
                  style={{
                    transform: `scale(${previewZoom / 100})`,
                    transformOrigin: "top center",
                    width: "210mm",
                    minHeight: "297mm",
                    marginBottom: `${Math.max(0, (previewZoom / 100 - 1) * 1120)}px`,
                    transition: "transform 0.15s ease-out",
                  }}
                  className="shrink-0 bg-white rounded shadow-2xl origin-top"
                >
                  <ResumeTemplateRenderer data={data} settings={settings} isPrint={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>

    {/* ── Dedicated Top-Level Print Container (Rendered ONLY during print / PDF save) ── */}
    <div id="print-root" className="hidden print:block bg-white text-slate-900 m-0 p-0">
      <ResumeTemplateRenderer data={data} settings={settings} isPrint={true} />
    </div>
  </>
  );
};

export default ResumeBuilder;
