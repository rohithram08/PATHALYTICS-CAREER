// src/components/resume/ResumeTemplates.tsx
import React from "react";
import { ResumeData, ResumeSettings } from "./types";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Code2,
  FolderGit2,
  Award,
} from "lucide-react";

interface TemplateProps {
  data: ResumeData;
  settings: ResumeSettings;
  isPrint?: boolean;
}

export const ResumeTemplateRenderer: React.FC<TemplateProps> = ({ data, settings, isPrint = false }) => {
  switch (settings.template) {
    case "harvard":
      return <HarvardTemplate data={data} settings={settings} isPrint={isPrint} />;
    case "executive":
      return <ExecutiveTemplate data={data} settings={settings} isPrint={isPrint} />;
    case "minimalist":
      return <MinimalistTemplate data={data} settings={settings} isPrint={isPrint} />;
    case "modern":
    default:
      return <ModernTemplate data={data} settings={settings} isPrint={isPrint} />;
  }
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE 1: MODERN PROFESSIONAL (With & Without Photo)
// ─────────────────────────────────────────────────────────────
export const ModernTemplate: React.FC<TemplateProps> = ({ data, settings, isPrint = false }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications } = data;
  const accent = settings.accentColor || "#3b82f6";

  const photoClass =
    settings.photoShape === "circle"
      ? "rounded-full"
      : settings.photoShape === "rounded"
      ? "rounded-xl"
      : "rounded-none";

  const containerClasses = isPrint
    ? "bg-white text-slate-800 p-0 font-sans w-full max-w-full min-h-0 mx-auto text-xs leading-relaxed"
    : "bg-white text-slate-800 p-8 shadow-md font-sans w-[210mm] min-h-[297mm] mx-auto text-xs leading-relaxed";

  return (
    <div
      id={isPrint ? undefined : "printable-resume"}
      className={containerClasses}
      style={{
        fontSize: settings.fontSize === "sm" ? "11px" : settings.fontSize === "lg" ? "13px" : "12px",
      }}
    >
      {/* Header */}
      <header className="border-b pb-4 mb-4 flex items-start justify-between gap-4 break-inside-avoid print:break-inside-avoid" style={{ borderColor: "#e2e8f0" }}>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ color: accent }}>
            {personalInfo.fullName || "Your Full Name"}
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {personalInfo.title || "Target Professional Title"}
          </p>

          {/* Contact Bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-600">
            {personalInfo.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                {personalInfo.email}
              </span>
            )}
            {personalInfo.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {personalInfo.phone}
              </span>
            )}
            {personalInfo.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {personalInfo.location}
              </span>
            )}
            {personalInfo.linkedin && (
              <a
                href={personalInfo.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-600"
              >
                <Linkedin className="w-3 h-3 text-slate-400" />
                LinkedIn
              </a>
            )}
            {personalInfo.github && (
              <a
                href={personalInfo.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-600"
              >
                <Github className="w-3 h-3 text-slate-400" />
                GitHub
              </a>
            )}
            {personalInfo.portfolio && (
              <a
                href={personalInfo.portfolio}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-600"
              >
                <Globe className="w-3 h-3 text-slate-400" />
                Portfolio
              </a>
            )}
          </div>
        </div>

        {/* Photo Slot (Conditional) */}
        {settings.withPhoto && personalInfo.photoUrl && (
          <div className="shrink-0">
            <img
              src={personalInfo.photoUrl}
              alt={personalInfo.fullName}
              className={`object-cover border-2 shadow-sm ${photoClass}`}
              style={{ width: "80px", height: "80px", objectFit: "cover", borderColor: accent }}
            />
          </div>
        )}
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-4 break-inside-avoid print:break-inside-avoid">
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-1.5 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Professional Summary
          </h2>
          <p className="text-slate-700 leading-normal text-justify">{summary}</p>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-2 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Work Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex items-baseline justify-between font-semibold">
                  <span className="text-slate-900 text-[12px]">{exp.role}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mb-1">
                  <span className="font-medium text-slate-800">{exp.company}</span>
                  {exp.location && ` • ${exp.location}`}
                </div>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700">
                  {exp.description.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-2 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Key Projects
          </h2>
          <div className="space-y-2.5">
            {projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex items-baseline justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900">{proj.title}</span>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-600">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {proj.technologies && (
                    <span className="text-[10px] text-slate-500 font-mono">[{proj.technologies}]</span>
                  )}
                </div>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700 mt-0.5">
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {(skills.technical.length > 0 || skills.frameworks.length > 0 || skills.tools.length > 0) && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-1.5 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Skills & Competencies
          </h2>
          <div className="space-y-1 text-slate-700">
            {skills.technical.length > 0 && (
              <div>
                <strong className="text-slate-900 font-semibold">Languages: </strong>
                {skills.technical.join(", ")}
              </div>
            )}
            {skills.frameworks.length > 0 && (
              <div>
                <strong className="text-slate-900 font-semibold">Frameworks & Libraries: </strong>
                {skills.frameworks.join(", ")}
              </div>
            )}
            {skills.tools.length > 0 && (
              <div>
                <strong className="text-slate-900 font-semibold">Cloud, Tools & DBs: </strong>
                {skills.tools.join(", ")}
              </div>
            )}
            {skills.soft.length > 0 && (
              <div>
                <strong className="text-slate-900 font-semibold">Professional: </strong>
                {skills.soft.join(", ")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-1.5 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Education
          </h2>
          <div className="space-y-1.5">
            {education.map((edu) => (
              <div key={edu.id} className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{edu.degree}</div>
                  <div className="text-slate-600">
                    {edu.institution}
                    {edu.field && ` — ${edu.field}`}
                    {edu.score && ` (${edu.score})`}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">{edu.year}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-1 border-b" style={{ color: accent, borderColor: "#e2e8f0" }}>
            Certifications & Honors
          </h2>
          <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700">
            {certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE 2: HARVARD / IVY LEAGUE CLASSIC ATS (Strict Parsing)
// ─────────────────────────────────────────────────────────────
export const HarvardTemplate: React.FC<TemplateProps> = ({ data, settings, isPrint = false }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications } = data;

  const containerClasses = isPrint
    ? "bg-white text-black p-0 font-serif w-full max-w-full min-h-0 mx-auto text-xs leading-relaxed"
    : "bg-white text-black p-8 shadow-md font-serif w-[210mm] min-h-[297mm] mx-auto text-xs leading-relaxed";

  return (
    <div
      id={isPrint ? undefined : "printable-resume"}
      className={containerClasses}
      style={{
        fontSize: settings.fontSize === "sm" ? "11px" : settings.fontSize === "lg" ? "13px" : "12px",
      }}
    >
      {/* Header */}
      <div className="text-center pb-2 mb-4 border-b border-black break-inside-avoid print:break-inside-avoid">
        <h1 className="text-xl font-bold uppercase tracking-widest text-black">
          {personalInfo.fullName || "Your Full Name"}
        </h1>
        {personalInfo.title && <p className="italic text-sm text-neutral-800 mt-0.5">{personalInfo.title}</p>}

        <div className="flex flex-wrap justify-center gap-x-2 text-[11px] mt-1.5 text-neutral-800">
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.location && personalInfo.phone && <span>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.phone && personalInfo.email && <span>•</span>}
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.linkedin && (
            <>
              <span>•</span>
              <a href={personalInfo.linkedin} className="underline text-black">
                LinkedIn
              </a>
            </>
          )}
          {personalInfo.github && (
            <>
              <span>•</span>
              <a href={personalInfo.github} className="underline text-black">
                GitHub
              </a>
            </>
          )}
        </div>

        {/* Optional photo if requested by user */}
        {settings.withPhoto && personalInfo.photoUrl && (
          <div className="mt-2 flex justify-center">
            <img
              src={personalInfo.photoUrl}
              alt={personalInfo.fullName}
              className="object-cover border border-black rounded-full"
              style={{ width: "64px", height: "64px", objectFit: "cover" }}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-3 break-inside-avoid print:break-inside-avoid">
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">
            Professional Summary
          </h2>
          <p className="text-justify leading-normal">{summary}</p>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5">
            Education
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="mb-1.5">
              <div className="flex justify-between font-bold">
                <span>{edu.institution}</span>
                <span>{edu.year}</span>
              </div>
              <div className="flex justify-between italic text-neutral-800">
                <span>
                  {edu.degree}
                  {edu.field && `, ${edu.field}`}
                </span>
                {edu.score && <span>{edu.score}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5">
            Experience
          </h2>
          {experience.map((exp) => (
            <div key={exp.id} className="mb-2">
              <div className="flex justify-between font-bold">
                <span>{exp.company}</span>
                <span className="font-normal text-[11px]">
                  {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                </span>
              </div>
              <div className="italic text-neutral-800 mb-0.5">
                {exp.role}
                {exp.location && ` — ${exp.location}`}
              </div>
              <ul className="list-disc list-outside pl-4 space-y-0.5">
                {exp.description.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5">
            Technical Projects
          </h2>
          {projects.map((proj) => (
            <div key={proj.id} className="mb-1.5">
              <div className="flex justify-between font-bold">
                <span>
                  {proj.title} {proj.technologies && <span className="font-normal italic">| {proj.technologies}</span>}
                </span>
                {proj.link && (
                  <a href={proj.link} className="font-normal underline text-[10px]">
                    Link
                  </a>
                )}
              </div>
              <ul className="list-disc list-outside pl-4 space-y-0.5 mt-0.5">
                {proj.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {(skills.technical.length > 0 || skills.frameworks.length > 0 || skills.tools.length > 0) && (
        <div className="mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">
            Technical Skills & Interests
          </h2>
          <div className="space-y-0.5">
            {skills.technical.length > 0 && (
              <div>
                <span className="font-bold">Languages: </span>
                {skills.technical.join(", ")}
              </div>
            )}
            {skills.frameworks.length > 0 && (
              <div>
                <span className="font-bold">Frameworks & Tools: </span>
                {skills.frameworks.concat(skills.tools).join(", ")}
              </div>
            )}
            {skills.soft.length > 0 && (
              <div>
                <span className="font-bold">Methodologies: </span>
                {skills.soft.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1">
            Certifications
          </h2>
          <ul className="list-disc list-outside pl-4 space-y-0.5">
            {certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE 3: EXECUTIVE SIDEBAR (With & Without Photo)
// ─────────────────────────────────────────────────────────────
export const ExecutiveTemplate: React.FC<TemplateProps> = ({ data, settings, isPrint = false }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications } = data;
  const accent = settings.accentColor || "#1e293b";

  const containerClasses = isPrint
    ? "bg-white text-slate-800 shadow-none font-sans w-full max-w-full min-h-0 mx-auto flex text-xs leading-relaxed"
    : "bg-white text-slate-800 shadow-md font-sans w-[210mm] min-h-[297mm] mx-auto flex text-xs leading-relaxed";

  return (
    <div
      id={isPrint ? undefined : "printable-resume"}
      className={containerClasses}
      style={{
        fontSize: settings.fontSize === "sm" ? "11px" : settings.fontSize === "lg" ? "13px" : "12px",
      }}
    >
      {/* Left Sidebar */}
      <aside className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between">
        <div>
          {/* Photo */}
          {settings.withPhoto && personalInfo.photoUrl && (
            <div className="mb-4 flex justify-center">
              <img
                src={personalInfo.photoUrl}
                alt={personalInfo.fullName}
                className="object-cover border-2 shadow-sm rounded-xl"
                style={{ width: "96px", height: "96px", objectFit: "cover", borderColor: accent }}
              />
            </div>
          )}

          {/* Contact */}
          <div className="mb-6">
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
              Contact
            </h3>
            <div className="space-y-2 text-[11px] text-slate-600 break-all">
              {personalInfo.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span>{personalInfo.email}</span>
                </div>
              )}
              {personalInfo.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span>{personalInfo.phone}</span>
                </div>
              )}
              {personalInfo.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span>{personalInfo.location}</span>
                </div>
              )}
              {personalInfo.linkedin && (
                <div className="flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <a href={personalInfo.linkedin} target="_blank" rel="noreferrer" className="hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
              {personalInfo.github && (
                <div className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <a href={personalInfo.github} target="_blank" rel="noreferrer" className="hover:underline">
                    GitHub
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          {education.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
                Education
              </h3>
              <div className="space-y-2.5">
                {education.map((edu) => (
                  <div key={edu.id}>
                    <p className="font-semibold text-slate-900 text-[11px]">{edu.degree}</p>
                    <p className="text-slate-600 text-[10px]">{edu.institution}</p>
                    <p className="text-slate-500 text-[10px]">{edu.year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div>
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
              Skills
            </h3>
            <div className="flex flex-wrap gap-1">
              {skills.technical.concat(skills.frameworks, skills.tools).map((s, i) => (
                <span
                  key={i}
                  className="bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-800 mb-1.5">
              Certifications
            </h3>
            <ul className="text-[10px] text-slate-600 space-y-1">
              {certifications.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <main className="w-2/3 p-6 flex-1">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
            {personalInfo.fullName || "Your Full Name"}
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-0.5">
            {personalInfo.title || "Target Professional Title"}
          </p>
        </header>

        {/* Summary */}
        {summary && (
          <section className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b pb-1 mb-1.5">
              Executive Profile
            </h2>
            <p className="text-slate-700 leading-relaxed text-justify">{summary}</p>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
              Professional Experience
            </h2>
            <div className="space-y-3">
              {experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{exp.role}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mb-1">{exp.company}</div>
                  <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700">
                    {exp.description.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b pb-1 mb-2">
              Key Projects & Impact
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{proj.title}</span>
                    {proj.technologies && (
                      <span className="text-[10px] text-slate-500 font-mono">[{proj.technologies}]</span>
                    )}
                  </div>
                  <ul className="list-disc list-outside pl-4 space-y-0.5 text-slate-700 mt-0.5">
                    {proj.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE 4: MINIMALIST TECH DEVELOPER (With & Without Photo)
// ─────────────────────────────────────────────────────────────
export const MinimalistTemplate: React.FC<TemplateProps> = ({ data, settings, isPrint = false }) => {
  const { personalInfo, summary, experience, education, projects, skills } = data;
  const accent = settings.accentColor || "#0f766e";

  const containerClasses = isPrint
    ? "bg-white text-neutral-800 p-0 font-sans w-full max-w-full min-h-0 mx-auto text-xs leading-normal"
    : "bg-white text-neutral-800 p-8 shadow-md font-sans w-[210mm] min-h-[297mm] mx-auto text-xs leading-normal";

  return (
    <div
      id={isPrint ? undefined : "printable-resume"}
      className={containerClasses}
      style={{
        fontSize: settings.fontSize === "sm" ? "11px" : settings.fontSize === "lg" ? "13px" : "12px",
      }}
    >
      <header className="flex justify-between items-start pb-3 mb-3 border-b-2 break-inside-avoid print:break-inside-avoid" style={{ borderColor: accent }}>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {personalInfo.fullName || "Your Full Name"}
          </h1>
          <p className="font-mono text-xs font-medium" style={{ color: accent }}>
            &gt; {personalInfo.title || "Full-Stack Engineer"}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10.5px] text-neutral-600 font-mono">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>{personalInfo.phone}</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
            {personalInfo.github && <span>github.com/{personalInfo.github.split("/").pop()}</span>}
            {personalInfo.linkedin && <span>in/{personalInfo.linkedin.split("/").pop()}</span>}
          </div>
        </div>

        {settings.withPhoto && personalInfo.photoUrl && (
          <img
            src={personalInfo.photoUrl}
            alt={personalInfo.fullName}
            className="object-cover rounded-lg border border-neutral-300"
            style={{ width: "64px", height: "64px", objectFit: "cover" }}
          />
        )}
      </header>

      {summary && (
        <section className="mb-3">
          <p className="text-neutral-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Tech Stack */}
      {(skills.technical.length > 0 || skills.frameworks.length > 0) && (
        <section className="mb-3.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
            // TECHNICAL_STACK
          </h2>
          <div className="bg-neutral-50 p-2.5 rounded border border-neutral-200 text-[11px] font-mono space-y-1">
            {skills.technical.length > 0 && (
              <div>
                <span className="text-neutral-500">const languages = </span>
                <span className="text-neutral-900 font-semibold">[{skills.technical.map((s) => `"${s}"`).join(", ")}];</span>
              </div>
            )}
            {skills.frameworks.length > 0 && (
              <div>
                <span className="text-neutral-500">const frameworks = </span>
                <span className="text-neutral-900 font-semibold">[{skills.frameworks.map((s) => `"${s}"`).join(", ")}];</span>
              </div>
            )}
            {skills.tools.length > 0 && (
              <div>
                <span className="text-neutral-500">const tools = </span>
                <span className="text-neutral-900 font-semibold">[{skills.tools.map((s) => `"${s}"`).join(", ")}];</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section className="mb-3.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accent }}>
            // WORK_EXPERIENCE
          </h2>
          <div className="space-y-2.5">
            {experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between font-semibold text-neutral-900">
                  <span>{exp.role} @ {exp.company}</span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    {exp.startDate} ~ {exp.current ? "now" : exp.endDate}
                  </span>
                </div>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-neutral-700 mt-0.5">
                  {exp.description.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="mb-3">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accent }}>
            // FEATURED_PROJECTS
          </h2>
          <div className="space-y-2">
            {projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between font-semibold text-neutral-900">
                  <div className="flex items-center gap-1.5">
                    <span>{proj.title}</span>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-neutral-800">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {proj.technologies && (
                    <span className="font-mono text-[10px] text-neutral-500">stack: {proj.technologies}</span>
                  )}
                </div>
                <ul className="list-disc list-outside pl-4 space-y-0.5 text-neutral-700 mt-0.5">
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>
            // EDUCATION
          </h2>
          {education.map((edu) => (
            <div key={edu.id} className="flex justify-between text-neutral-800">
              <span>
                <strong>{edu.degree}</strong> — {edu.institution} {edu.score && `(${edu.score})`}
              </span>
              <span className="font-mono text-[10px] text-neutral-500">{edu.year}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
