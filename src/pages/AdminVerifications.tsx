// src/pages/AdminVerifications.tsx
//
// Admin-only page. Accessible via /admin/verifications.
// To make a user an admin, run in your DB:
//   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, FileText, Building2,
  Clock, Loader2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface PendingDoc {
  id: number;
  document_type: string;
  original_filename: string;
  uploaded_at: string;
  company_name: string;
  company_tier: string;
  recruiter_user_id: number;
  recruiter_name: string;
  recruiter_email: string;
}

const docTypeLabel: Record<string, string> = {
  incorporation_certificate: "Incorporation certificate",
  gst_certificate: "GST certificate",
  company_pan: "Company PAN",
  other: "Other",
};

const AdminVerifications = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/verifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setDocs(await res.json());
    } catch {
      toast.error("Could not load pending documents");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const review = async (docId: number, action: "approve" | "reject") => {
    if (action === "reject" && !rejectReason[docId]?.trim()) {
      toast.error("Enter a rejection reason before rejecting");
      return;
    }
    setActioning(docId);
    try {
      const res = await fetch(`${API_URL}/api/admin/verifications/${docId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: rejectReason[docId] ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(action === "approve" ? "Document approved — recruiter notified" : "Document rejected — recruiter notified");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Verification Queue</h1>
          <p className="text-muted-foreground">Pending recruiter document reviews</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
          <p className="font-semibold text-lg">All caught up</p>
          <p className="text-sm text-muted-foreground">No documents pending review</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {docs.map((doc, i) => (
            <motion.div key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="p-5 space-y-4">
                {/* Company + recruiter info */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{doc.company_name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">
                        {doc.company_tier} tier
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.recruiter_name} · {doc.recruiter_email}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Document info */}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {docTypeLabel[doc.document_type] ?? doc.document_type}
                    </p>
                  </div>
                  <a
                    href={`${API_URL}/api/admin/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline shrink-0">
                    View file
                  </a>
                </div>

                {/* Rejection reason input */}
                <Input
                  placeholder="Rejection reason (required to reject)"
                  value={rejectReason[doc.id] ?? ""}
                  onChange={(e) =>
                    setRejectReason((p) => ({ ...p, [doc.id]: e.target.value }))
                  }
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => review(doc.id, "approve")}
                    disabled={actioning === doc.id}>
                    {actioning === doc.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => review(doc.id, "reject")}
                    disabled={actioning === doc.id}>
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;