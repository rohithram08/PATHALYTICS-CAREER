// src/test/resumeBuilder.test.ts
import { describe, it, expect } from "vitest";
import { analyzeResumeATS, POWER_VERBS } from "@/components/resume/atsScorer";
import { SAMPLE_RESUME_DATA } from "@/components/resume/sampleResumeData";
import { ResumeData, ResumeSettings } from "@/components/resume/types";

describe("ATS Resume Builder & Scoring Engine", () => {
  const defaultSettings: ResumeSettings = {
    template: "modern",
    withPhoto: true,
    photoShape: "rounded",
    accentColor: "#2563eb",
    fontSize: "base",
    spacing: "normal",
  };

  it("calculates high ATS readiness score for comprehensive sample data", () => {
    const audit = analyzeResumeATS(SAMPLE_RESUME_DATA, defaultSettings);

    expect(audit.score).toBeGreaterThanOrEqual(90);
    expect(audit.grade).toBe("A+");
    expect(audit.actionVerbsFound.length).toBeGreaterThanOrEqual(4);
    expect(audit.metricsFoundCount).toBeGreaterThanOrEqual(3);

    const contactCheck = audit.checks.find((c) => c.title === "Essential Contact Info");
    expect(contactCheck?.passed).toBe(true);

    const metricsCheck = audit.checks.find((c) => c.title === "Quantifiable Metrics & Scale");
    expect(metricsCheck?.passed).toBe(true);
  });

  it("detects missing contact info and penalizes empty resumes", () => {
    const emptyResume: ResumeData = {
      personalInfo: {
        fullName: "",
        title: "",
        email: "invalid-email",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        portfolio: "",
      },
      summary: "",
      skills: { technical: [], frameworks: [], tools: [], soft: [] },
      experience: [],
      education: [],
      projects: [],
      certifications: [],
    };

    const audit = analyzeResumeATS(emptyResume, { ...defaultSettings, withPhoto: false });
    expect(audit.score).toBeLessThan(40);
    expect(audit.grade).toBe("Needs Improvement");

    const contactCheck = audit.checks.find((c) => c.title === "Essential Contact Info");
    expect(contactCheck?.passed).toBe(false);
  });

  it("identifies power verbs correctly from experience bullets", () => {
    expect(POWER_VERBS.has("architected")).toBe(true);
    expect(POWER_VERBS.has("spearheaded")).toBe(true);
    expect(POWER_VERBS.has("optimized")).toBe(true);
    expect(POWER_VERBS.has("engineered")).toBe(true);
  });

  it("generates photo advisory when withPhoto is enabled", () => {
    const withPhotoAudit = analyzeResumeATS(SAMPLE_RESUME_DATA, { ...defaultSettings, withPhoto: true });
    const photoCheck = withPhotoAudit.checks.find((c) => c.title === "ATS Photo Advisory");
    expect(photoCheck).toBeDefined();

    const withoutPhotoAudit = analyzeResumeATS(SAMPLE_RESUME_DATA, { ...defaultSettings, withPhoto: false });
    const noPhotoCheck = withoutPhotoAudit.checks.find((c) => c.title === "ATS Photo Advisory");
    expect(noPhotoCheck).toBeUndefined();
  });
});
