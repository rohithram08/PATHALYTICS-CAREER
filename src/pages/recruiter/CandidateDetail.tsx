// src/pages/recruiter/CandidateDetail.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, GraduationCap,
  FolderGit2, Linkedin, Github, ExternalLink, Calendar, Clock,
  CheckCircle2, XCircle, Eye, MessageSquare, Star, Loader2, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  recruiterApi,
  API_URL,
  type RecruiterCandidateDetail as CandidateDetailData,
} from "@/lib/api";

const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  applied:   { label: "Applied",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  screening: { label: "Screening", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  interview: { label: "Interview", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  offer:     { label: "Offer",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  hired:     { label: "Hired",     color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  rejected:  { label: "Rejected",  color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<CandidateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Message modal state
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchCandidate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await recruiterApi.candidates.get(id);
      setCandidate(data);
      setMessageSubject(`Regarding your application for ${data.job_title}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load candidate application");
      navigate("/recruiter/candidates");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleStageChange = async (newStage: string) => {
    if (!candidate || !id) return;
    setUpdatingStage(true);
    try {
      await recruiterApi.applications.updateStatus(id, { status: newStage });
      setCandidate((prev) => (prev ? { ...prev, stage: newStage } : prev));
      toast.success(`Application updated to '${STAGE_META[newStage]?.label || newStage}'. Candidate notified!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not update application status");
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !messageSubject.trim() || !messageBody.trim()) {
      toast.error("Please enter a subject and message body");
      return;
    }
    setSendingMessage(true);
    try {
      await recruiterApi.messages.send(candidate.user_id, messageSubject.trim(), messageBody.trim());
      toast.success(`Message sent to ${candidate.name}!`);
      setMessageOpen(false);
      setMessageBody("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) return null;

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const meta = STAGE_META[candidate.stage] || STAGE_META.applied;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/recruiter/candidates">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Application</span>
              <span className="text-xs text-muted-foreground">#{candidate.application_id}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{candidate.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stage Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Stage:</span>
            <Select
              value={candidate.stage}
              onValueChange={handleStageChange}
              disabled={updatingStage}
            >
              <SelectTrigger className={`w-36 h-9 font-medium border ${meta.bg} ${meta.color}`}>
                {updatingStage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_META[s]?.label || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resume Download */}
          {candidate.resume_storage_key ? (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${API_URL}/api/recruiter/resumes/${candidate.application_id}/download`}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Resume
              </a>
            </Button>
          ) : null}

          {/* Send Message */}
          <Button size="sm" onClick={() => setMessageOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
        </div>
      </div>

      {/* ── Hero Profile Card ──────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {candidate.avatar_url ? (
                <img
                  src={candidate.avatar_url}
                  alt={candidate.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold border-2 border-primary/20 shrink-0">
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{candidate.name}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground font-medium">
                  Applied for <span className="text-foreground font-semibold">{candidate.job_title}</span>
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {candidate.email}
                  </span>
                  {candidate.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {candidate.phone}
                    </span>
                  )}
                  {candidate.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {candidate.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Applied {new Date(candidate.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2 self-start md:self-center">
              {candidate.linkedin_url && (
                <Button size="icon" variant="outline" className="h-9 w-9" asChild>
                  <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn">
                    <Linkedin className="w-4 h-4 text-blue-600" />
                  </a>
                </Button>
              )}
              {candidate.github_url && (
                <Button size="icon" variant="outline" className="h-9 w-9" asChild>
                  <a href={candidate.github_url} target="_blank" rel="noreferrer" title="GitHub">
                    <Github className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {candidate.portfolio_url && (
                <Button size="icon" variant="outline" className="h-9 w-9" asChild>
                  <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" title="Portfolio">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Details Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Cover Note / Pitch
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.notes ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {candidate.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No cover note provided with this application.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.work_experience && candidate.work_experience.length > 0 ? (
                <div className="space-y-4">
                  {candidate.work_experience.map((exp, idx) => (
                    <div key={idx} className="border-l-2 border-primary/30 pl-4 py-1 space-y-1">
                      <div className="flex items-center justify-between flex-wrap">
                        <h4 className="font-semibold text-sm">{exp.title}</h4>
                        <span className="text-xs text-muted-foreground font-medium">
                          {exp.startDate} – {exp.endDate || "Present"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">{exp.company}</p>
                      {exp.description && (
                        <p className="text-xs text-foreground/80 mt-1">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {candidate.current_role ? (
                    <p>
                      Currently <span className="font-medium text-foreground">{candidate.current_role}</span>
                      {candidate.current_company && ` at ${candidate.current_company}`}.
                    </p>
                  ) : (
                    <p className="italic">No formal work experience listed in profile.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.education && candidate.education.length > 0 ? (
                <div className="space-y-3">
                  {candidate.education.map((edu, idx) => (
                    <div key={idx} className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{edu.degree}</h4>
                        <p className="text-xs text-muted-foreground">{edu.institution}</p>
                      </div>
                      {(edu.startYear || edu.endYear) && (
                        <span className="text-xs text-muted-foreground">
                          {edu.startYear} – {edu.endYear}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No education entries listed.</p>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          {candidate.projects && candidate.projects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-primary" />
                  Key Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.projects.map((proj, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{proj.title}</h4>
                      {proj.url && (
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View Project <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {proj.description && <p className="text-xs text-muted-foreground">{proj.description}</p>}
                    {proj.techStack && (
                      <p className="text-[11px] font-mono text-muted-foreground">
                        Tech: {proj.techStack}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Key Attributes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Candidate Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="font-semibold mt-0.5">{candidate.years_of_experience || "Entry level"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Current Role</p>
                <p className="font-semibold mt-0.5">
                  {candidate.current_role || "Candidate"}
                  {candidate.current_company && ` (${candidate.current_company})`}
                </p>
              </div>

              {candidate.notice_period && (
                <div>
                  <p className="text-xs text-muted-foreground">Notice Period</p>
                  <p className="font-semibold mt-0.5">{candidate.notice_period}</p>
                </div>
              )}

              {candidate.expected_salary && (
                <div>
                  <p className="text-xs text-muted-foreground">Expected Salary</p>
                  <p className="font-semibold mt-0.5">{candidate.expected_salary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skills & Competencies</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs font-normal">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No skills specified.</p>
              )}
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-primary">Hiring Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setMessageOpen(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Schedule Interview / Message
              </Button>

              {candidate.stage !== "offer" && candidate.stage !== "hired" && (
                <Button
                  className="w-full justify-start text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                  variant="outline"
                  onClick={() => handleStageChange("offer")}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Extend Job Offer
                </Button>
              )}

              {candidate.stage !== "rejected" && (
                <Button
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  variant="ghost"
                  onClick={() => handleStageChange("rejected")}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Rejected
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Message Dialog ────────────────────────────────────── */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSendMessage}>
            <DialogHeader>
              <DialogTitle>Message {candidate.name}</DialogTitle>
              <DialogDescription>
                Send a direct notification message regarding their application for {candidate.job_title}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="msg-subject">Subject</Label>
                <Input
                  id="msg-subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="e.g. Next steps for your application"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="msg-body">Message</Label>
                <Textarea
                  id="msg-body"
                  rows={5}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Hi candidate, we were impressed by your profile..."
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMessageOpen(false)}
                disabled={sendingMessage}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sendingMessage}>
                {sendingMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
