// src/components/JobListings.jsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ExternalLink,
  MapPin,
  TrendingUp,
  SearchX,
  AlertCircle,
  Zap,
  CheckCircle2,
  X,
  Calendar,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApplications, addApplication } from "@/lib/applications";
import { fetchAllGreenhouseJobs } from "@/lib/greenhouseAPI";

/* ---------- Types ---------- */
interface AdzunaJob {
  id?: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  description: string;
  created?: string;
}

interface UnifiedJob {
  id: string;
  source: "greenhouse" | "adzuna";
  title: string;
  companyName: string;
  companySlug?: string;
  greenhouseId?: number;
  location: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt?: string;
  description?: string;
}

/* ---------- Adzuna config ---------- */
const ADZUNA_APP_ID = import.meta.env.VITE_ADZUNA_APP_ID ?? "0bc48e50";
const ADZUNA_APP_KEY =
  import.meta.env.VITE_ADZUNA_APP_KEY ?? "0c9564d8b4e3cb94ebd9a6d33a8fdec8";

/* ---------- Props ---------- */
interface JobListingsProps {
  resultsPerPage?: number;
  hideMoreLink?: boolean;
  hideHeader?: boolean;
  searchQuery?: string;
}

/* ---------- Helpers ---------- */
const formatSalary = (min?: number, max?: number) => {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      notation: n >= 100000 ? "compact" : "standard",
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
};

const timeAgo = (iso?: string) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
};

/* ---------- Strip HTML from Adzuna descriptions ---------- */
const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ---------- Skeleton ---------- */
const JobCardSkeleton = () => (
  <div className="p-6 rounded-2xl bg-card border border-border animate-pulse">
    <div className="flex gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
    <div className="h-3 bg-muted rounded w-2/3 mb-4" />
    <div className="h-4 bg-muted rounded w-1/3 mb-4" />
    <div className="h-9 bg-muted rounded" />
  </div>
);

/* ---------- Job Detail Modal (Centered) ---------- */
const JobDetailDrawer = ({
  job,
  isApplied,
  onClose,
  onApply,
}: {
  job: UnifiedJob | null;
  isApplied: boolean;
  onClose: () => void;
  onApply: (job: UnifiedJob) => void;
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (job) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [job]);

  if (!job) return null;

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const posted = timeAgo(job.postedAt);
  const isEasyApply = job.source === "greenhouse";
  const description = job.description ? stripHtml(job.description) : null;

  return (
    <>
      {/* ✅ Full-screen backdrop — clicking outside closes modal */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ✅ Centered modal wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Job details: ${job.title}`}
          className="
            pointer-events-auto
            relative w-full max-w-2xl max-h-[90vh]
            bg-background border border-border rounded-2xl shadow-2xl
            flex flex-col overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-start gap-4 p-6 border-b border-border bg-card shrink-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl text-foreground leading-tight">
                {job.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {job.companyName}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close job details"
              className="p-2 rounded-full hover:bg-muted transition-colors shrink-0 ml-2"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* ── Meta chips ── */}
          <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-border bg-card/60 shrink-0">
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <MapPin className="w-3 h-3" />
              {job.location}
            </Badge>
            {posted && (
              <Badge variant="secondary" className="gap-1.5 font-normal">
                <Calendar className="w-3 h-3" />
                {posted}
              </Badge>
            )}
            {salary && (
              <Badge className="gap-1.5 font-normal bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                {salary}
              </Badge>
            )}
            {isEasyApply && (
              <Badge className="gap-1.5 font-normal bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Zap className="w-3 h-3 fill-amber-500" />
                Greenhouse Job
              </Badge>
            )}
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Source info banner */}
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-4 py-3">
              <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {isEasyApply
                  ? "Listed on Greenhouse — you'll be taken to the company's official application form."
                  : "Listed on Adzuna — clicking Apply will open the company's original job post."}
              </span>
            </div>

            {/* Description */}
            {description ? (
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-3 uppercase tracking-wider">
                  About This Role
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Full description available on the company's site.</p>
              </div>
            )}

            {/* Already applied notice */}
            {isApplied && (
              <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <p className="text-sm font-medium text-success">
                  You've already applied to this role.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer actions ── */}
          <div className="px-6 py-4 border-t border-border bg-card shrink-0 space-y-2">
            {isApplied ? (
              <>
                <Button className="w-full gap-2" variant="outline" disabled>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Already Applied
                </Button>
                <Button className="w-full gap-2" variant="ghost" asChild>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View Original Posting
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button
                  className={`w-full gap-2 h-11 text-base font-semibold ${
                    isEasyApply
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : ""
                  }`}
                  onClick={() => onApply(job)}
                >
                  {isEasyApply ? (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Apply on Greenhouse
                    </>
                  ) : (
                    <>
                      Apply on Company Site
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground pb-1">
                  {isEasyApply
                    ? "Opens the official Greenhouse application form in a new tab."
                    : "Opens the original job posting in a new tab."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/* ---------- Interleave ---------- */
function interleaveJobs<T>(a: T[], b: T[]): T[] {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const result: T[] = [];
  const total = a.length + b.length;
  let aIdx = 0, bIdx = 0;
  const aWeight = a.length / total;
  for (let i = 0; i < total; i++) {
    const remainingA = a.length - aIdx;
    const remainingB = b.length - bIdx;
    if (remainingA === 0) result.push(b[bIdx++]);
    else if (remainingB === 0) result.push(a[aIdx++]);
    else {
      const pickA = Math.random() < aWeight + (Math.random() - 0.5) * 0.3;
      if (pickA) result.push(a[aIdx++]);
      else result.push(b[bIdx++]);
    }
  }
  return result;
}

/* ========== MAIN COMPONENT ========== */
const JobListings = ({
  resultsPerPage = 6,
  hideMoreLink = false,
  hideHeader = false,
  searchQuery,
}: JobListingsProps) => {
  const [jobs, setJobs] = useState<UnifiedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Detail drawer
  const [detailJob, setDetailJob] = useState<UnifiedJob | null>(null);

  // Applied tracking
  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set());

  const refreshAppliedSet = () =>
    setAppliedSet(new Set(getApplications().map((a) => a.jobId)));

  useEffect(() => { refreshAppliedSet(); }, []);

  /* ---------- Fetch ---------- */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const effectiveQuery = searchQuery?.trim() || "software engineer developer";
    const encodedQuery = encodeURIComponent(effectiveQuery);

    const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${encodedQuery}&results_per_page=${resultsPerPage}&content-type=application/json`;

    const adzunaPromise = fetch(adzunaUrl, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data): UnifiedJob[] =>
        (data.results || []).map((j: AdzunaJob, i: number) => ({
          id: j.id ? `adz-${j.id}` : `adz-${j.redirect_url}-${i}`,
          source: "adzuna" as const,
          title: j.title,
          companyName: j.company.display_name,
          location: j.location.display_name,
          url: j.redirect_url,
          salaryMin: j.salary_min,
          salaryMax: j.salary_max,
          postedAt: j.created,
          description: j.description,
        }))
      )
      .catch(() => [] as UnifiedJob[]);

    const greenhousePromise = fetchAllGreenhouseJobs(searchQuery?.trim(), resultsPerPage)
      .then((ghJobs): UnifiedJob[] =>
        ghJobs.map((j) => ({
          id: `gh-${j.company_slug}-${j.id}`,
          source: "greenhouse" as const,
          title: j.title,
          companyName: j.company_name,
          companySlug: j.company_slug,
          greenhouseId: j.id,
          location: j.location.name,
          url: j.absolute_url,
          postedAt: j.updated_at,
        }))
      )
      .catch(() => [] as UnifiedJob[]);

    Promise.all([greenhousePromise, adzunaPromise])
      .then(([gh, adz]) => setJobs(interleaveJobs(gh, adz)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [resultsPerPage, searchQuery]);

// ✅ CORRECT — addApplication auto-generates both id and appliedAt
const handleApply = (job: UnifiedJob) => {
  addApplication({
    jobId: job.id,
    jobTitle: job.title,
    company: job.companyName,
    location: job.location,
    jobUrl: job.url,
    status: "applied",
  });
  refreshAppliedSet();
  setDetailJob(null);
  window.open(job.url, "_blank", "noopener,noreferrer");
};

  return (
    <section
      className={hideHeader ? "pb-12" : "py-24"}
      aria-labelledby="jobs-heading"
    >
      <div className="container mx-auto px-4">
        {!hideHeader && (
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <TrendingUp className="w-4 h-4" />
              <span>Live Job Market</span>
            </div>
            <h2 id="jobs-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trending Job Opportunities
            </h2>
            <p className="text-lg text-muted-foreground">
              Real-time listings — click{" "}
              <strong>Details</strong> to preview any role before you apply.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
            {Array.from({ length: resultsPerPage }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div role="alert" className="text-center py-16 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="font-semibold text-lg mb-2 text-foreground">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">Unable to load job listings right now.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <SearchX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2 text-foreground">No matching jobs found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `We couldn't find live jobs for "${searchQuery}". Try a broader search.`
                : "No live jobs are available right now."}
            </p>
            <Button asChild><Link to="/roadmaps">Explore careers</Link></Button>
          </div>
        )}

        {/* Success */}
        {!loading && !error && jobs.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, index) => {
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                const posted = timeAgo(job.postedAt);
                const alreadyApplied = appliedSet.has(job.id);
                const isEasyApply = job.source === "greenhouse";

                return (
                  <article
                    key={job.id}
                    className="group relative flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm
                               hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5
                               focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2
                               transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
                  >
                    {/* Badge (top-right) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {alreadyApplied && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Applied
                        </span>
                      )}
                      {!alreadyApplied && isEasyApply && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium border border-amber-500/20">
                          <Zap className="w-3 h-3 fill-amber-500" />
                          Greenhouse
                        </span>
                      )}
                    </div>

                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors pr-20"
                          title={job.title}
                        >
                          {job.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{job.companyName}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{job.location}</span>
                      </span>
                      {posted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {posted}
                        </span>
                      )}
                    </div>

                    {/* Salary */}
                    {salary && (
                      <p className="text-sm font-medium text-accent mb-4">{salary}</p>
                    )}

                    {/* ✅ FIX: Two clearly differentiated buttons */}
                    <div className="mt-auto pt-2 flex gap-2">
                      {/* "Details" — always opens the DRAWER (in-app preview) */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 relative z-10"
                        onClick={() => setDetailJob(job)}
                        aria-label={`View details for ${job.title}`}
                      >
                        Details
                      </Button>

                      {/* Apply button — only if not already applied */}
                      {alreadyApplied ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 gap-1.5 text-success cursor-default"
                          disabled
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Applied
                        </Button>
                      ) : isEasyApply ? (
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white relative z-10"
                          onClick={() => handleApply(job)}
                          title="Opens official Greenhouse application in a new tab"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          Apply
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 relative z-10"
                          onClick={() => handleApply(job)}
                          title="Opens original job posting in a new tab"
                        >
                          Apply
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {!hideMoreLink && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/jobs">More Live Jobs</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ Job Detail Drawer (replaces the broken Details link) */}
      <JobDetailDrawer
        job={detailJob}
        isApplied={detailJob ? appliedSet.has(detailJob.id) : false}
        onClose={() => setDetailJob(null)}
        onApply={handleApply}
      />
    </section>
  );
};

export default JobListings;