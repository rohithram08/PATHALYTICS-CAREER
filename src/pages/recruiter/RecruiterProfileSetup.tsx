// src/pages/recruiter/RecruiterProfileSetup.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft, Upload, Trash2, FileText, CheckCircle2,
  Clock, AlertCircle, Loader2, Building2, Save,
} from "lucide-react";
import { Button }                                   from "@/components/ui/button";
import { Input }                                    from "@/components/ui/input";
import { Label }                                    from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Constants ─────────────────────────────────────────────────────────────────

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

const DOCUMENT_TYPES = [
  { value: "company_registration", label: "Company Registration Certificate" },
  { value: "gst_certificate",      label: "GST Certificate"                  },
  { value: "pan_card",             label: "PAN Card"                         },
  { value: "address_proof",        label: "Address Proof"                    },
  { value: "other",                label: "Other"                            },
] as const;

type DocTypeValue = (typeof DOCUMENT_TYPES)[number]["value"];

const VERIFICATION_CONFIG = {
  pending: {
    label:     "Pending Review",
    icon:      Clock,
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    message:   "Our team is reviewing your documents. This usually takes 1–2 business days.",
  },
  verified: {
    label:     "Verified",
    icon:      CheckCircle2,
    className: "bg-green-50 text-green-700 border-green-200",
    message:   "Your account is verified. You can post jobs and access all recruiter features.",
  },
  rejected: {
    label:     "Rejected",
    icon:      AlertCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    message:   "Verification was rejected. Please re-upload corrected documents.",
  },
} as const;

type VerificationStatus = keyof typeof VERIFICATION_CONFIG;

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_FILE_SIZE_MB   = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecruiterProfile {
  company_name:        string;
  company_size:        string;
  industry:            string;
  designation:         string;
  website:             string;
  verification_status: VerificationStatus;
  rejection_reason?:   string;
}

interface UploadedDocument {
  id:            number;
  document_type: DocTypeValue;
  file_name:     string;
  uploaded_at:   string;
  status:        VerificationStatus;
}

const DEFAULT_PROFILE: RecruiterProfile = {
  company_name:        "",
  company_size:        "1-10",
  industry:            "",
  designation:         "",
  website:             "",
  verification_status: "pending",
};

// ── File validation ───────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return "Only PDF, JPG, PNG, and WebP files are allowed";
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return `File must be smaller than ${MAX_FILE_SIZE_MB} MB`;
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VerificationBanner({
  status,
  rejectionReason,
}: {
  status:           VerificationStatus;
  rejectionReason?: string;
}) {
  const cfg        = VERIFICATION_CONFIG[status] ?? VERIFICATION_CONFIG.pending;
  const StatusIcon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.className}`}>
      <StatusIcon className="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-sm">{cfg.label}</p>
        <p className="text-xs mt-0.5">
          {cfg.message}
          {status === "rejected" && rejectionReason && ` Reason: ${rejectionReason}`}
        </p>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  onDelete,
  isDeleting,
}: {
  doc:        UploadedDocument;
  onDelete:   (id: number) => void;
  isDeleting: boolean;
}) {
  const docLabel   = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label ?? doc.document_type;
  const statusCfg  = VERIFICATION_CONFIG[doc.status] ?? VERIFICATION_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {docLabel} · {new Date(doc.uploaded_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </p>
      </div>
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusCfg.className}`}>
        <StatusIcon className="w-3 h-3" />
        {statusCfg.label}
      </span>
      <button
        type="button"
        onClick={() => onDelete(doc.id)}
        disabled={isDeleting}
        aria-label="Delete document"
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-1 disabled:opacity-50"
      >
        {isDeleting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RecruiterProfileSetup() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile,        setProfile]        = useState<RecruiterProfile>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile]  = useState(true);
  const [savingProfile,  setSavingProfile]   = useState(false);

  // Document state
  const [documents,   setDocuments]   = useState<UploadedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [docType,     setDocType]     = useState<DocTypeValue>(DOCUMENT_TYPES[0].value);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/profile`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch {
      toast.error("Could not load profile");
    } finally {
      setLoadingProfile(false);
    }
  }, [token]);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/documents`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDocuments(await res.json());
    } catch {
      toast.error("Could not load documents");
    } finally {
      setLoadingDocs(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
    loadDocuments();
  }, [loadProfile, loadDocuments]);

  // ── Save profile ──────────────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!profile.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/profile`, {
        method:      "PATCH",
        credentials: "include",
        headers:     { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_name: profile.company_name.trim(),
          company_size: profile.company_size,
          industry:     profile.industry.trim(),
          designation:  profile.designation.trim(),
          website:      profile.website.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Upload document ───────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) { toast.error(validationError); return; }

    setUploading(true);
    setUploadPct(0);

    const formData = new FormData();
    formData.append("document",      file);
    formData.append("document_type", docType);

    try {
      // XHR gives upload progress; fetch does not
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/recruiter/documents/upload`);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const msg = (() => {
              try { return (JSON.parse(xhr.responseText) as { message?: string }).message; }
              catch { return undefined; }
            })();
            reject(new Error(msg ?? "Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error — check your connection"));
        xhr.send(formData);
      });

      toast.success("Document uploaded successfully");
      await loadDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }, [docType, loadDocuments, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // ── Delete document ───────────────────────────────────────────────────────

  const deleteDocument = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/recruiter/documents/${id}`, {
        method:      "DELETE",
        credentials: "include",
        headers:     { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete document");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/recruiter/dashboard"><ChevronLeft className="w-4 h-4" /></Link>
          </Button>
          <h1 className="font-semibold">Profile &amp; Verification</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Verification status banner */}
        {!loadingProfile && (
          <VerificationBanner
            status={profile.verification_status}
            rejectionReason={profile.rejection_reason}
          />
        )}

        {/* Company profile */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingProfile ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="company_name">
                    Company name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    placeholder="e.g. Acme Technologies Pvt. Ltd."
                    value={profile.company_name}
                    onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Company size</Label>
                    <Select
                      value={profile.company_size}
                      onValueChange={(v) => setProfile((p) => ({ ...p, company_size: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>{s} employees</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      placeholder="e.g. Software & IT"
                      value={profile.industry}
                      onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="designation">Your designation</Label>
                    <Input
                      id="designation"
                      placeholder="e.g. HR Manager"
                      value={profile.designation}
                      onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="website">Company website</Label>
                    <Input
                      id="website"
                      placeholder="https://yourcompany.com"
                      value={profile.website}
                      onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Save className="w-4 h-4 mr-2" />}
                  Save profile
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Document upload */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" /> Verification Documents
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Upload at least one company document for identity verification.
              Accepted: PDF, JPG, PNG — max {MAX_FILE_SIZE_MB} MB each.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Document type */}
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocTypeValue)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload document"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
              className={[
                "relative flex flex-col items-center justify-center gap-3",
                "border-2 border-dashed rounded-xl p-10 transition-colors",
                uploading
                  ? "cursor-default opacity-70 border-muted-foreground/20"
                  : isDragging
                  ? "cursor-copy border-primary bg-primary/5"
                  : "cursor-pointer border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
              ].join(" ")}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS}
                onChange={handleFileChange}
                className="sr-only"
                aria-hidden="true"
              />

              {uploading ? (
                <div className="text-center space-y-3 w-full max-w-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium">Uploading… {uploadPct}%</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drop file here or{" "}
                      <span className="text-primary underline underline-offset-2">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG, WebP — max {MAX_FILE_SIZE_MB} MB
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Uploaded documents list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Uploaded documents
              </p>
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  No documents uploaded yet
                </p>
              ) : (
                documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onDelete={deleteDocument}
                    isDeleting={deletingId === doc.id}
                  />
                ))
              )}
            </div>

          </CardContent>
        </Card>

      </main>
    </div>
  );
}