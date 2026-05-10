// src/components/ApplyModal.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Zap, Loader2, CheckCircle2, Mail, Upload, AlertCircle,
  FileText, Sparkles, ExternalLink, Copy, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast }                     from '@/hooks/use-toast';
import { addApplication, hasAppliedTo } from '@/lib/applications';

export interface ApplyJobInfo {
  id: string;
  title: string;
  company: string;
  companySlug?: string;
  greenhouseJobId?: number;
  location: string;
  url: string;
}

interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ApplyJobInfo;
  variant: 'direct' | 'external';
  onApplied?: () => void;
}

interface ApplyForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: ApplyForm = { firstName: '', lastName: '', email: '', phone: '' };
let cachedForm: ApplyForm | null = null;
const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000';
const STEPS = ['Your Info', 'Review', 'Done'] as const;

const StepBar = ({ current, labels }: { current: number; labels: readonly string[] }) => (
  <div className="flex items-center mb-5">
    {labels.map((label, i) => {
      const n = i + 1;
      const done = current > n;
      const active = current === n;
      return (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              done    ? 'bg-primary border-primary text-primary-foreground'
              : active ? 'border-primary text-primary bg-primary/10'
                       : 'border-border text-muted-foreground bg-background'
            }`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
            </div>
            <span className={`text-xs whitespace-nowrap ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${done ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      );
    })}
  </div>
);

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {children}
    {error && (
      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
        <AlertCircle className="w-3 h-3" />{error}
      </p>
    )}
  </div>
);

export const ApplyModal = ({ open, onOpenChange, job, variant, onApplied }: ApplyModalProps) => {
  const { toast } = useToast();
  const [step,        setStep]        = useState<1 | 2 | 3>(1);
  const [form,        setForm]        = useState<ApplyForm>(cachedForm ?? EMPTY_FORM);
  const [resume,      setResume]      = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState<Partial<ApplyForm>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep(cachedForm ? 2 : 1);
      setForm(cachedForm ?? EMPTY_FORM);
      setResume(null); setCoverLetter('');
      setErrors({}); setServerError(null); setSubmitting(false);
    }
  }, [open]);

  const set = (k: keyof ApplyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<ApplyForm> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim())  errs.lastName  = 'Required';
    if (!form.email.trim())     errs.email     = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Resume must be under 5 MB.', variant: 'destructive' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setResume(file);
  };

  const handleContinue = () => {
    if (!validate()) return;
    if (variant === 'direct' && !resume) {
      toast({ title: 'Resume required', description: 'Please upload your resume.', variant: 'destructive' });
      return;
    }
    cachedForm = form;
    setStep(2);
  };

  const generateCoverLetter = () => {
    setCoverLetter(
      `Dear Hiring Manager at ${job.company},\n\nI am excited to apply for the ${job.title} role at ${job.company}. I would welcome the opportunity to discuss how my background and skills can contribute to your team.\n\nBest regards,\n${form.firstName} ${form.lastName}\n${form.email}${form.phone ? ` · ${form.phone}` : ''}`
    );
  };

  const handleDirectSubmit = async () => {
    setServerError(null);
    if (!job.companySlug || !job.greenhouseJobId) {
      setServerError('Missing Greenhouse configuration for this job.'); return;
    }
    if (hasAppliedTo(job.id)) {
      toast({ title: 'Already applied', description: 'This job is already in your tracker.' });
      setStep(3); return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('first_name', form.firstName);
      fd.append('last_name',  form.lastName);
      fd.append('email',      form.email);
      if (form.phone)  fd.append('phone',       form.phone);
      if (resume)      fd.append('resume',       resume);
      if (coverLetter) fd.append('cover_letter', coverLetter);

      const res  = await fetch(
        `${API_BASE}/api/greenhouse/apply/${job.companySlug}/${job.greenhouseJobId}`,
        { method: 'POST', body: fd },
      );
      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Submission failed');

      addApplication({
        jobId: job.id, jobTitle: job.title, company: job.company,
        location: job.location, jobUrl: job.url, status: 'applied',
        submittedVia: 'greenhouse', customCoverLetter: coverLetter || undefined,
      });
      setStep(3); onApplied?.();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setSubmitting(false); }
  };

  const handleExternalPrepare = async () => {
    if (!hasAppliedTo(job.id)) {
      addApplication({
        jobId: job.id, jobTitle: job.title, company: job.company,
        location: job.location, jobUrl: job.url, status: 'applied',
        submittedVia: 'external', customCoverLetter: coverLetter || undefined,
      });
    } else {
      toast({ title: 'Already tracked' });
    }
    const clip = [
      `${form.firstName} ${form.lastName}`, form.email, form.phone,
      coverLetter ? `\n--- Cover Letter ---\n${coverLetter}` : null,
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(clip).catch(() => {});
    setStep(3); onApplied?.();
  };

  const openEmployerSite = () => window.open(job.url, '_blank', 'noopener,noreferrer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            {variant === 'direct'
              ? <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              : <Sparkles className="w-4 h-4 text-primary" />}
            {variant === 'direct' ? 'Easy Apply' : 'Smart Apply'} — {job.title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-medium text-foreground">{job.company}</span> · {job.location}
          </DialogDescription>
        </DialogHeader>

        <StepBar current={step} labels={STEPS} />

        {/* ── STEP 1: Info ── */}
        {step === 1 && (
          <div className="space-y-4">
            {variant === 'direct' && (
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2.5 flex gap-2 text-sm">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Your application will be <strong className="text-foreground">submitted directly</strong> to {job.company} via Greenhouse.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required error={errors.firstName}>
                <Input value={form.firstName} onChange={set('firstName')} autoFocus
                  className={errors.firstName ? 'border-destructive' : ''} />
              </Field>
              <Field label="Last name" required error={errors.lastName}>
                <Input value={form.lastName} onChange={set('lastName')}
                  className={errors.lastName ? 'border-destructive' : ''} />
              </Field>
              <div className="col-span-2">
                <Field label="Email" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={set('email')}
                    className={errors.email ? 'border-destructive' : ''} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Phone">
                  <Input type="tel" value={form.phone} onChange={set('phone')} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={variant === 'direct' ? 'Resume (PDF/DOC/DOCX)' : 'Resume (optional)'}
                  required={variant === 'direct'}>
                  <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} />
                </Field>
                {resume && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Upload className="w-3 h-3 text-primary" />
                    <span className="font-medium text-foreground">{resume.name}</span>
                    · {(resume.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleContinue} className="gap-1.5">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">Your details</p>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStep(1)}>Edit</Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Name: </span>{form.firstName} {form.lastName}</div>
                <div><span className="text-muted-foreground">Email: </span>{form.email}</div>
                {form.phone && <div><span className="text-muted-foreground">Phone: </span>{form.phone}</div>}
                {resume && (
                  <div className="col-span-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Resume: </span><span>{resume.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Cover letter <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={generateCoverLetter}>
                  <Sparkles className="w-3.5 h-3.5" /> Generate
                </Button>
              </div>
              <Textarea rows={6} placeholder="Write a cover letter or click Generate…"
                value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)}
                className="text-sm resize-none" />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              {variant === 'direct'
                ? <><strong className="text-foreground">What happens: </strong>Details submitted directly to {job.company}. Auto-logged in My Applications.</>
                : <><strong className="text-foreground">What happens: </strong>Logged in My Applications, details copied to clipboard, then {job.company}'s site opens.</>}
            </div>

            {serverError && (
              <div className="bg-destructive/8 border border-destructive/25 rounded-lg p-3 flex gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive text-xs">Submission failed</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              {variant === 'direct' ? (
                <Button onClick={handleDirectSubmit} disabled={submitting} className="gap-2 min-w-[150px]">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><Zap className="w-4 h-4" /> Submit Application</>}
                </Button>
              ) : (
                <Button onClick={handleExternalPrepare} className="gap-2">
                  <Copy className="w-4 h-4" /> Prepare &amp; Open Site
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {variant === 'direct' ? 'Application Submitted! 🎉' : "You're all set!"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {variant === 'direct'
                  ? `${job.company} has received your application.`
                  : 'Details copied. Open the employer site to paste and submit.'}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-left text-sm space-y-2.5">
              {variant === 'direct' ? (
                <>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>Check <strong>{form.email}</strong> for a confirmation from {job.company}.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Logged in <strong>My Applications</strong>. Update status when you hear back.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <Copy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>Details copied — paste them on the employer's form.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Logged in <strong>My Applications</strong>. Update your status after submitting.</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {variant === 'external' && (
                <Button onClick={openEmployerSite} className="gap-2">
                  Open Employer Site <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};