// src/components/resume/types.ts

export type ResumeTemplateId = "modern" | "harvard" | "executive" | "minimalist";

export interface WorkExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  field?: string;
  year: string;
  score?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  technologies: string;
  link?: string;
  bullets: string[];
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
    photoUrl?: string;
  };
  summary: string;
  skills: {
    technical: string[];
    frameworks: string[];
    tools: string[];
    soft: string[];
  };
  experience: WorkExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
}

export interface ResumeSettings {
  template: ResumeTemplateId;
  withPhoto: boolean;
  photoShape: "circle" | "rounded" | "square";
  accentColor: string;
  fontSize: "sm" | "base" | "lg";
  spacing: "compact" | "normal" | "relaxed";
}

export interface AtsAuditResult {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "Needs Improvement";
  actionVerbsFound: string[];
  metricsFoundCount: number;
  checks: {
    title: string;
    passed: boolean;
    feedback: string;
  }[];
}
