// src/pages/recruiter/CandidatesList.tsx
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, Briefcase, MapPin, ExternalLink, Github,
  Linkedin, Zap, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  recruiterApi,
  type RecruiterCandidate as Candidate,
  type RecruiterJobSummary as Job,
} from "@/lib/api";

const CandidateCard = ({
  candidate,
  index,
}: {
  candidate: Candidate;
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const skills: string[] = Array.isArray(candidate.skills)
    ? candidate.skills
    : (() => {
        try { return JSON.parse(candidate.skills ?? "[]"); }
        catch { return []; }
      })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="overflow-hidden">
        <div className="p-4 flex items-start gap-4">
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg shrink-0">
            {candidate.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold">{candidate.name}</h3>
                {candidate.current_role && (
                  <p className="text-sm text-muted-foreground">
                    {candidate.current_role}
                    {candidate.current_company && ` at ${candidate.current_company}`}
                  </p>
                )}
              </div>

              {/* Match score badge — only in match mode */}
              {candidate.score !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                  <Zap className="w-3 h-3" />
                  {candidate.score} skill{candidate.score !== 1 ? "s" : ""} matched
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{candidate.location}
                </span>
              )}
              {candidate.years_of_experience && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />{candidate.years_of_experience} exp
                </span>
              )}
            </div>

            {/* Matched skills highlighted */}
            {candidate.matchedSkills && candidate.matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.matchedSkills.map((s) => (
                  <Badge key={s} className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {/* All skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skills
                  .filter((s) => !(candidate.matchedSkills ?? []).includes(s))
                  .slice(0, 8)
                  .map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="text-muted-foreground hover:text-foreground transition-colors mt-1 shrink-0"
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="border-t px-4 py-3 bg-muted/20 flex flex-wrap gap-4 text-sm"
          >
            {candidate.notice_period && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Notice period</p>
                <p className="font-medium">{candidate.notice_period}</p>
              </div>
            )}
            {candidate.expected_salary && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Expected salary</p>
                <p className="font-medium">{candidate.expected_salary}</p>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline text-xs">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </a>
              )}
              {candidate.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline text-xs">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </a>
              )}
              {candidate.portfolio_url && (
                <a href={candidate.portfolio_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                </a>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

// ── Main page ────────────────────────────────────────────────
const CandidatesList = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [mode, setMode] = useState<"browse" | "match">("browse");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [matchedJob, setMatchedJob] = useState<{ title: string } | null>(null);

  const browse = useCallback(async () => {
    setLoading(true);
    try {
      setCandidates(
        await recruiterApi.candidates.browse({
          search: search.trim() || undefined,
          skill: skillFilter.trim() || undefined,
        })
      );
    } catch {
      toast.error("Could not load candidates");
    } finally {
      setLoading(false);
    }
  }, [search, skillFilter]);

  const runMatch = async () => {
    if (!selectedJobId) return;
    setMatchLoading(true);
    try {
      const data = await recruiterApi.candidates.match(selectedJobId);
      setCandidates(data.candidates);
      setMatchedJob(data.job);
      setMode("match");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Match failed");
    } finally {
      setMatchLoading(false);
    }
  };

  // Load jobs for the match selector + initial candidate browse
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const all = await recruiterApi.jobs.mine();
        setJobs(all.filter((j) => j.status === "published"));
      } catch { /* non-fatal */ }
    };
    loadJobs();
    browse();
  }, [browse]);

  const resetToBrowse = () => {
    setMode("browse");
    setMatchedJob(null);
    browse();
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Candidates</h1>
        <p className="text-muted-foreground mt-1">
          Students who are open to recruiter outreach
        </p>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6 space-y-4">
        {/* Browse filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && browse()}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Filter by skill (e.g. React)"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && browse()}
            className="w-52"
          />
          <Button variant="outline" onClick={browse} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t" />
          <span className="text-xs text-muted-foreground">or find best matches for a job</span>
          <div className="flex-1 border-t" />
        </div>

        {/* Job match */}
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="flex-1 min-w-52">
              <SelectValue placeholder="Select a published job to match against" />
            </SelectTrigger>
            <SelectContent>
              {jobs.length === 0 ? (
                <SelectItem value="none" disabled>No published jobs yet</SelectItem>
              ) : (
                jobs.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={runMatch}
            disabled={!selectedJobId || matchLoading}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {matchLoading ? "Matching..." : "Find Best Matches"}
          </Button>
          {mode === "match" && (
            <Button variant="outline" onClick={resetToBrowse}>
              Clear match
            </Button>
          )}
        </div>
      </Card>

      {/* Results header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {loading || matchLoading
            ? "Loading..."
            : mode === "match" && matchedJob
            ? `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} matched for "${matchedJob.title}" — sorted by skill overlap`
            : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} found`}
        </span>
      </div>

      {/* Candidate cards */}
      {loading || matchLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">
            {mode === "match"
              ? "No candidates matched this job's requirements"
              : "No candidates found"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "match"
              ? "Try a different job, or browse all candidates instead"
              : "Try a different search term or skill filter"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((c, i) => (
            <CandidateCard key={c.id} candidate={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidatesList;