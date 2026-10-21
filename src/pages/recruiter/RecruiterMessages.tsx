// src/pages/recruiter/RecruiterMessages.tsx
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, Plus, Mail, CheckCircle2, Clock, Search,
  Send, User, Loader2, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { recruiterApi, type RecruiterMessage } from "@/lib/api";

export default function RecruiterMessages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillTo = searchParams.get("to");

  const [messages, setMessages] = useState<RecruiterMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<RecruiterMessage | null>(null);

  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(prefillTo || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recruiterApi.messages.list();
      setMessages(data);
      if (data.length > 0 && !selectedMessage) {
        setSelectedMessage(data[0]);
      }
    } catch {
      toast.error("Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [selectedMessage]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (prefillTo) {
      setRecipientId(prefillTo);
      setComposeOpen(true);
    }
  }, [prefillTo]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const rId = Number(recipientId);
    if (!rId || isNaN(rId)) {
      toast.error("Please enter a valid candidate user ID");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required");
      return;
    }

    setSending(true);
    try {
      await recruiterApi.messages.send(rId, subject.trim(), body.trim());
      toast.success("Message sent successfully!");
      setComposeOpen(false);
      setSubject("");
      setBody("");
      if (prefillTo) {
        searchParams.delete("to");
        setSearchParams(searchParams);
      }
      await fetchMessages();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Messages</h1>
          <p className="text-sm text-muted-foreground">
            Direct communications, interview invitations, and outreach with candidates
          </p>
        </div>

        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Compose Message
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No outreach messages yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Start engaging candidates! Click "Compose Message" or use the message button directly on candidate cards to send interview invites or feedback.
            </p>
          </div>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send First Message
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Message List */}
          <div className="md:col-span-1 space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {messages.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card hover:bg-muted/40 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{msg.recipient_name}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(msg.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground/90 truncate mt-0.5">
                    {msg.subject}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {msg.body}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Message Detail View */}
          <div className="md:col-span-2">
            {selectedMessage ? (
              <Card className="h-full">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>To: <strong className="text-foreground">{selectedMessage.recipient_name}</strong> ({selectedMessage.recipient_email})</span>
                        <span>•</span>
                        <span>
                          {new Date(selectedMessage.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <Badge variant={selectedMessage.read_at ? "secondary" : "outline"} className="text-xs">
                      {selectedMessage.read_at ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Read
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1 text-yellow-600" /> Sent
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 font-normal">
                    {selectedMessage.body}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                Select a message to view details
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Compose Modal ────────────────────────────────────── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSend}>
            <DialogHeader>
              <DialogTitle>New Outreach Message</DialogTitle>
              <DialogDescription>
                Send a message directly to a candidate's Pathalytics inbox.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="candidate-id">Candidate User ID</Label>
                <Input
                  id="candidate-id"
                  type="number"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="e.g. 42"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compose-subject">Subject</Label>
                <Input
                  id="compose-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Interview Invitation — Software Engineer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compose-body">Message Body</Label>
                <Textarea
                  id="compose-body"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi candidate, we came across your profile and would love to schedule a brief screening call..."
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setComposeOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
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
