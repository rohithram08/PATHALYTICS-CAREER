// src/components/resume/atsScorer.ts
import { ResumeData, AtsAuditResult, ResumeSettings } from "./types";

export const POWER_VERBS = new Set([
  "accelerated", "achieved", "architected", "automated", "built", "centralized",
  "championed", "collaborated", "constructed", "converted", "created", "decreased",
  "delivered", "deployed", "designed", "developed", "directed", "eliminated",
  "engineered", "enhanced", "established", "executed", "expanded", "expedited",
  "formulated", "generated", "guided", "implemented", "improved", "increased",
  "initiated", "instituted", "integrated", "introduced", "launched", "led",
  "leveraged", "managed", "maximized", "mentored", "migrated", "modernized",
  "negotiated", "operated", "optimized", "orchestrated", "overhauled", "pioneered",
  "produced", "programmed", "reduced", "refactored", "resolved", "restructured",
  "revamped", "scaled", "simplified", "spearheaded", "standardized", "streamlined",
  "strengthened", "surpassed", "transformed", "upgraded", "validated",
]);

export function analyzeResumeATS(data: ResumeData, settings: ResumeSettings): AtsAuditResult {
  const checks: AtsAuditResult["checks"] = [];
  let score = 0;

  // 1. Personal Info & Contact Details (20 pts)
  const hasName = Boolean(data.personalInfo.fullName.trim());
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email.trim());
  const hasPhone = Boolean(data.personalInfo.phone.trim().length >= 7);
  const hasLinks = Boolean(data.personalInfo.linkedin.trim() || data.personalInfo.github.trim());

  if (hasName) score += 5;
  if (hasEmail) score += 5;
  if (hasPhone) score += 5;
  if (hasLinks) score += 5;

  checks.push({
    title: "Essential Contact Info",
    passed: hasName && hasEmail && hasPhone,
    feedback: hasName && hasEmail && hasPhone
      ? "Name, verified email format, and phone number present."
      : "Ensure full name, phone number, and a valid professional email are filled.",
  });

  checks.push({
    title: "Online Profiles (LinkedIn / GitHub)",
    passed: hasLinks,
    feedback: hasLinks
      ? "Professional links added for technical recruiters to review your work."
      : "Add your LinkedIn or GitHub profile link to provide proof of technical competence.",
  });

  // 2. Professional Summary (15 pts)
  const summaryLength = data.summary.trim().split(/\s+/).filter(Boolean).length;
  const summaryPassed = summaryLength >= 25 && summaryLength <= 100;
  if (summaryLength >= 15) score += 10;
  if (summaryPassed) score += 5;

  checks.push({
    title: "Professional Summary Impact",
    passed: summaryPassed,
    feedback: summaryPassed
      ? `Summary length is optimal (${summaryLength} words).`
      : summaryLength < 25
      ? "Summary is too brief. Aim for 30–75 words stating your target role, years of experience, and primary achievement."
      : "Summary is slightly long. Keep it under 100 words so recruiters can skim within 6 seconds.",
  });

  // 3. Work Experience & Quantifiable Impact (30 pts)
  const hasExperience = data.experience.length > 0;
  const allBullets = data.experience.flatMap((e) => e.description);
  
  // Search for metrics: digits, percentages, dollar amounts, multipliers (e.g. 40%, $2M, 3x, 500K)
  const metricRegex = /(\b\d+(\.\d+)?%|\$\d+(\.\d+)?[kKmMbB]?|\b\d+[xX]\b|\b\d{2,}\b|\b\d+\s*(ms|sec|hours|days|users|events|requests))/g;
  let metricsCount = 0;
  const foundVerbs = new Set<string>();

  allBullets.forEach((bullet) => {
    const text = bullet.toLowerCase();
    const words = text.split(/[\s,.;:!?()]+/).filter(Boolean);
    words.forEach((w) => {
      if (POWER_VERBS.has(w)) {
        foundVerbs.add(w);
      }
    });

    const m = bullet.match(metricRegex);
    if (m) metricsCount += m.length;
  });

  if (hasExperience) score += 10;
  if (metricsCount >= 3) score += 10;
  else if (metricsCount >= 1) score += 5;

  if (foundVerbs.size >= 4) score += 10;
  else if (foundVerbs.size >= 2) score += 5;

  checks.push({
    title: "Quantifiable Metrics & Scale",
    passed: metricsCount >= 3,
    feedback: metricsCount >= 3
      ? `Strong measurable impact found (${metricsCount} metrics detected: %, numbers, scale).`
      : `Add more quantifiable achievements (${metricsCount} found). Use the Google X-Y-Z formula: "Accomplished [X], as measured by [Y], by doing [Z]".`,
  });

  checks.push({
    title: "High-Impact Action Verbs",
    passed: foundVerbs.size >= 4,
    feedback: foundVerbs.size >= 4
      ? `Excellent action verb usage (${foundVerbs.size} distinct power verbs identified).`
      : `Incorporate stronger action verbs (e.g., 'Architected', 'Spearheaded', 'Optimized', 'Scaled'). Currently found: ${foundVerbs.size}.`,
  });

  // 4. Skills Categorization (15 pts)
  const totalSkills =
    data.skills.technical.length +
    data.skills.frameworks.length +
    data.skills.tools.length +
    data.skills.soft.length;

  const skillsPassed = totalSkills >= 8 && totalSkills <= 35;
  if (totalSkills >= 5) score += 10;
  if (skillsPassed) score += 5;

  checks.push({
    title: "Technical Skills Breadth",
    passed: skillsPassed,
    feedback: skillsPassed
      ? `Strong skill balance (${totalSkills} technical and domain skills listed).`
      : totalSkills < 8
      ? "List at least 8 relevant core skills, languages, or frameworks for ATS keyword matching."
      : "Too many skills listed (over 35). Focus on the core stack to avoid keyword stuffing flags.",
  });

  // 5. Education & Projects (20 pts)
  const hasEducation = data.education.length > 0;
  const hasProjects = data.projects.length > 0;

  if (hasEducation) score += 10;
  if (hasProjects) score += 10;

  checks.push({
    title: "Education & Technical Projects",
    passed: hasEducation && hasProjects,
    feedback: hasEducation && hasProjects
      ? "Education and key project highlights are fully documented."
      : "Include both degree credentials and at least one technical project demonstrating practical implementation.",
  });

  // 6. Photo & ATS Parser Suitability Check
  if (settings.withPhoto) {
    checks.push({
      title: "ATS Photo Advisory",
      passed: true,
      feedback:
        "Note: In North America (US/Canada) and the UK, standard corporate ATS systems (Workday, Taleo, Greenhouse) recommend photo-less resumes to prevent unconscious bias. In European, APAC, and creative portfolios, photo resumes are welcomed.",
    });
  }

  // Calculate Grade
  let grade: AtsAuditResult["grade"] = "Needs Improvement";
  if (score >= 90) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 50) grade = "C";

  return {
    score: Math.min(100, Math.max(0, score)),
    grade,
    actionVerbsFound: Array.from(foundVerbs),
    metricsFoundCount: metricsCount,
    checks,
  };
}
