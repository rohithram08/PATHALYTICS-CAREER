// src/lib/applications.ts

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  portfolio?: string;
  github?: string;
  yearsOfExperience: string;
  currentRole?: string;
  currentCompany?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  resumeFileName?: string;
  resumeDataUrl?: string;
  coverLetterTemplate?: string;
  skills: string[];
}

export type ApplicationStatus =
  | 'applied'
  | 'in-review'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  jobUrl: string;
  appliedAt: string;
  status: ApplicationStatus;
  submittedVia?: 'greenhouse' | 'external';
  notes?: string;
  customCoverLetter?: string;
  answers?: Record<string, string>;
}

const PROFILE_KEY = 'user_apply_profile';
const APPS_KEY    = 'user_job_applications';

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; emoji: string; color: string; bgColor: string }
> = {
  applied:     { label: 'Applied',    emoji: '📨', color: 'text-blue-600 dark:text-blue-400',    bgColor: 'bg-blue-500/10 border-blue-500/20' },
  'in-review': { label: 'In Review',  emoji: '👀', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  interview:   { label: 'Interview',  emoji: '💬', color: 'text-amber-600 dark:text-amber-400',   bgColor: 'bg-amber-500/10 border-amber-500/20' },
  offer:       { label: 'Offer',      emoji: '🎉', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  rejected:    { label: 'Rejected',   emoji: '❌', color: 'text-red-600 dark:text-red-400',       bgColor: 'bg-red-500/10 border-red-500/20' },
  withdrawn:   { label: 'Withdrawn',  emoji: '🚫', color: 'text-gray-600 dark:text-gray-400',     bgColor: 'bg-gray-500/10 border-gray-500/20' },
};

function saveApplications(apps: JobApplication[]): void {
  try { localStorage.setItem(APPS_KEY, JSON.stringify(apps)); } catch { /* silent */ }
}

export function getUserProfile(): UserProfile | null {
  try { const raw = localStorage.getItem(PROFILE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function saveUserProfile(profile: UserProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* silent */ }
}

export function getApplications(): JobApplication[] {
  try { const raw = localStorage.getItem(APPS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export function addApplication(app: Omit<JobApplication, 'id' | 'appliedAt'>): JobApplication {
  const apps = getApplications();
  const newApp: JobApplication = {
    ...app,
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `app-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    appliedAt: new Date().toISOString(),
  };
  apps.unshift(newApp);
  saveApplications(apps);
  return newApp;
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  saveApplications(getApplications().map((a) => a.id === id ? { ...a, status } : a));
}

export function updateApplicationNotes(id: string, notes: string): void {
  saveApplications(getApplications().map((a) => a.id === id ? { ...a, notes } : a));
}

export function removeApplication(id: string): void {
  saveApplications(getApplications().filter((a) => a.id !== id));
}

export function hasAppliedTo(jobId: string): boolean {
  return getApplications().some((a) => a.jobId === jobId);
}

export function getApplicationsByStatus(status: ApplicationStatus): JobApplication[] {
  return getApplications().filter((a) => a.status === status);
}

export function getStatusCounts(): Record<ApplicationStatus, number> {
  const counts: Record<ApplicationStatus, number> = {
    applied: 0, 'in-review': 0, interview: 0, offer: 0, rejected: 0, withdrawn: 0,
  };
  getApplications().forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
  return counts;
}