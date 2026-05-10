import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { userKey } from "@/lib/userStorage";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_CHATBOT_URL || "http://localhost:8000";
const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_KEY = "pathalytics_chat_history";
const MAX_STORED_MESSAGES = 50;

interface Message {
  id: string;
  text: string;
  who: "user" | "bot";
  intent?: string;
  targetUrl?: string | null;
  structuredData?: any;
  timestamp: number;
}

interface ChatResponse {
  reply?: string;
  intent?: string;
  target_url?: string | null;
  has_roadmap_json?: boolean;
  roadmap_data?: any;
  structured_data?: any;
  website_evaluation?: any;
}

function cleanTextForDisplay(text: unknown): string {
  if (typeof text !== "string" || !text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");
  cleaned = cleaned.replace(/NAVIGATE:\S+/g, "");
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  return cleaned.trim();
}

function formatBotText(text: unknown): string {
  const cleaned = cleanTextForDisplay(text);
  if (!cleaned) return "";
  return cleaned.split(/(?<=[.!?])\s+/).join("\n");
}

function extractJsonBlock(text: string): any | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const sessionKey = userKey("pathalytics_session");
    if (!localStorage.getItem(sessionKey)) {
      localStorage.setItem(sessionKey, makeId());
    }

    try {
      const saved = localStorage.getItem(userKey(HISTORY_KEY));
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed)) {
          setMessages(
            parsed.filter(
              (m) =>
                m &&
                typeof m.text === "string" &&
                (m.who === "user" || m.who === "bot")
            )
          );
        }
      }
    } catch (err) {
      console.warn("[Chat] Failed to restore history:", err);
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        userKey(HISTORY_KEY),
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch (err) {
      console.warn("[Chat] Failed to persist history:", err);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
      }
      setInput(transcript.trim());
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening]);

  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 96) + "px";
  };

  const clearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(userKey(HISTORY_KEY));
    } catch {}
    toast.success("Chat cleared");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error("Message too long", {
        description: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`,
      });
      return;
    }

    const userMsg: Message = {
      id: makeId(),
      text,
      who: "user",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sessionId =
        localStorage.getItem(userKey("pathalytics_session")) || "default";

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          message: text,
          current_page: window.location.pathname,
          user_level: "intermediate",
          session_id: `browser-${sessionId}`,
        }),
        signal: controller.signal,
      });

      let data: ChatResponse | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      const rawReply =
        res.ok && data && typeof data.reply === "string" ? data.reply : "";

      const structuredData =
        data?.structured_data ??
        data?.roadmap_data ??
        extractJsonBlock(rawReply);

      const replyText = res.ok
        ? formatBotText(rawReply || "I’m not sure I understood that.")
        : `⚠️ ${
            (data as any)?.detail ||
            (data as any)?.message ||
            `Server returned ${res.status}`
          }`;

      const botMsg: Message = {
        id: makeId(),
        text: replyText || "I didn’t quite get that. Could you rephrase it?",
        who: "bot",
        intent: data?.intent,
        targetUrl: data?.target_url ?? null,
        structuredData,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      if (err?.name === "AbortError") return;

      const isOffline =
        err instanceof TypeError && /failed to fetch/i.test(err.message);

      const errorMsg: Message = {
        id: makeId(),
        text: isOffline
          ? "I can't reach the chatbot service. Please make sure the backend is running on port 8000."
          : "Sorry, something went wrong. Please try again.",
        who: "bot",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
          className="bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-full p-4 shadow-[0_10px_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_14px_36px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="w-80 h-[460px] rounded-2xl shadow-[0_18px_55px_hsl(var(--background)/0.85)] border border-primary/40 flex flex-col overflow-hidden animate-fade-in bg-card">
          <div className="px-3 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm flex items-center justify-between">
            <span>Pathalytics Assistant</span>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  aria-label="Clear chat"
                  className="hover:opacity-80 transition-opacity p-1"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="hover:opacity-80 transition-opacity p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-background text-foreground text-[13px] scrollbar-thin">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-xs mt-8 px-4">
                <p className="mb-2">Hi! I’m your career assistant.</p>
                <p>Ask me about careers, skills, or roadmaps.</p>
                <div className="mt-4 space-y-1.5">
                  {[
                    "What career suits a Python beginner?",
                    "Show me the frontend roadmap",
                    "AI/ML vs Full Stack — which is better?",
                  ].map((sample) => (
                    <button
                      key={sample}
                      onClick={() => setInput(sample)}
                      className="block w-full text-left px-2 py-1 rounded hover:bg-muted transition-colors text-foreground/80"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.who === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`inline-block px-3 py-1.5 max-w-[80%] whitespace-pre-wrap break-words ${
                    msg.who === "user"
                      ? "bg-primary text-primary-foreground rounded-[14px] rounded-br-[4px]"
                      : "bg-muted text-foreground rounded-[14px] rounded-bl-[4px] border border-border"
                  }`}
                >
                  {msg.text || "(empty response)"}

                  {msg.structuredData?.type === "career_guidance" && (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Recommended: {msg.structuredData.recommended_career}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Roadmap: {msg.structuredData.recommended_roadmap}
                          </p>
                        </div>
                      </div>

                      {msg.structuredData.skills_to_focus?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.structuredData.skills_to_focus.map((skill: string) => (
                            <span
                              key={skill}
                              className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {msg.structuredData.next_steps?.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {msg.structuredData.next_steps.map((step: string, i: number) => (
                            <li key={i}>• {step}</li>
                          ))}
                        </ul>
                      )}

                      {msg.structuredData.target_path && (
                        <a
                          href={msg.structuredData.target_path}
                          className="inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          Open roadmap <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {msg.targetUrl && (
                    <a
                      href={msg.targetUrl}
                      className="block mt-2 text-xs underline text-primary hover:opacity-80"
                    >
                      → Take me there
                    </a>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <span className="inline-block px-3 py-1.5 bg-muted text-muted-foreground rounded-[14px] rounded-bl-[4px] border border-border">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                  </span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-end gap-1.5 p-2 border-t border-border bg-card">
            {recognitionRef.current && (
              <button
                onClick={toggleMic}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
                className={`rounded-full p-2 transition-colors flex-shrink-0 ${
                  isListening
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Ask about careers, skills..."
              aria-label="Chat message"
              className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-[13px] resize-none min-h-[32px] max-h-[96px] overflow-y-auto focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />

            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="rounded-full p-2 bg-primary text-primary-foreground shadow-[0_6px_18px_hsl(var(--primary)/0.6)] hover:shadow-[0_8px_24px_hsl(var(--primary)/0.7)] hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;