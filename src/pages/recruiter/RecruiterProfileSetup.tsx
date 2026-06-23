// src/pages/recruiter/RecruiterProfileSetup.tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Document {
  id: number;
  document_type: string;
  original_filename: string;
  review_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  uploaded_at: string;
}

interface Profile {
  company_name: string;
  company_size: string;
  industry: string;
  designation: string;
  company_tier: "top" | "mid" | "low";
  verification_status: "pending" | "verified" | "rejected";
}

const tierLabel = { top: "Top-tier", mid: "Mid-range", low: "Startup / Low-tier" };
const tierColor = {
  top: "text-emerald-600 bg-emerald-50",
  mid: "text-blue-600 bg-blue-50",
  low: "text-orange-600 bg-orange-50",
};
const docStatusIcon = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  approved: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
};

const RecruiterProfileSetup = () => {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("incorporation_certificate");
  const [form, setForm] = useState({ companyName: "", companySize: "", industry: "", designation: "" });

  const load = async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        fetch(`${API_URL}/api/recruiter/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/recruiter/documents`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!pRes.ok) throw new Error();
      const p: Profile = await pRes.json();
      setProfile(p);
      setForm({
        companyName: p.company_name,
        companySize: p.company_size,
        industry: p.industry,
        designation: p.designation,
      });
      if (dRes.ok) setDocs(await dRes.json());
    } catch {
      toast.error("Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/recruiter/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("document", file);
    fd.append("documentType", docType);
    try {
      const res = await fetch(`${API_URL}/api/recruiter/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Document uploaded — our team will review it shortly");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Company Profile</h1>

        {profile && (
          <div className="flex items-center gap-3 mb-8">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${tierColor[profile.company_tier]}`}>
              {tierLabel[profile.company_tier]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              profile.verification_status === "verified"
                ? "bg-emerald-100 text-emerald-700"
                : profile.verification_status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {profile.verification_status === "verified" ? "✓ Verified" :
               profile.verification_status === "rejected" ? "✗ Rejected" : "⏳ Pending verification"}
            </span>
          </div>
        )}

        {/* Profile form */}
        <Card className="p-6 space-y-5 mb-6">
          <h2 className="font-semibold text-lg">Company information</h2>

          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company size</Label>
              <Select value={form.companySize} onValueChange={(v) => setForm({ ...form, companySize: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1-10","11-50","51-200","201-500","501-1000","1000+"].map((s) => (
                    <SelectItem key={s} value={s}>{s} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your designation</Label>
            <Input value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
        </Card>

        {/* Document upload — only relevant for low-tier (no corporate domain) */}
        {profile?.company_tier === "low" && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-lg">Verification documents</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Because your signup email isn't on a corporate domain, please upload at least
                one company document. Our team reviews these within 1–2 business days.
              </p>
            </div>

            {/* Existing docs */}
            {docs.length > 0 && (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    {docStatusIcon[doc.review_status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.document_type.replace(/_/g, " ")} ·{" "}
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                      {doc.review_status === "rejected" && doc.rejection_reason && (
                        <p className="text-xs text-red-600 mt-0.5">{doc.rejection_reason}</p>
                      )}
                    </div>
                    <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${
                      doc.review_status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      doc.review_status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {doc.review_status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Document type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incorporation_certificate">Incorporation certificate</SelectItem>
                    <SelectItem value="gst_certificate">GST certificate</SelectItem>
                    <SelectItem value="company_pan">Company PAN</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed h-12"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}>
                {uploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  : <><Upload className="w-4 h-4 mr-2" />Click to upload (PDF / JPG / PNG, max 10MB)</>}
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default RecruiterProfileSetup;