import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { userKey } from '@/lib/userStorage';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/lib/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const API_BASE = import.meta.env.VITE_CHATBOT_URL || API_URL;

const quickQuestions = [
  'What career is best for me?',
  'How do I become a Data Scientist?',
  'What skills should I learn first?',
  'Is AI/ML a good career choice?',
  'How to prepare for tech interviews?',
  'Best resources for learning coding?',
];

const initialMessage: Message = {
  id: 1,
  role: 'assistant',
  content:
    "Hello! I'm your AI Career Mentor. 👋\n\nI'm here to help you navigate your career journey in tech. Whether you're exploring career options, learning new skills, or preparing for interviews, I've got you covered.\n\nHow can I assist you today?",
  timestamp: new Date(),
};

const Chatbot = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;

    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current) {
    const key = userKey('pathalytics_session');
    let stored = localStorage.getItem(key);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(key, stored);
    }
    sessionIdRef.current = stored;
  }

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const token = localStorage.getItem('pathalytics_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText.trim(),
          history: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          current_page: window.location.pathname,
          user_level: 'intermediate',
          session_id: `browser-${sessionIdRef.current}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch chatbot response');
      }

      const data = await res.json();

      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data?.reply || 'Sorry, I could not generate a response right now.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const botMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content:
          'Sorry, I had trouble reaching the server. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([{ ...initialMessage, timestamp: new Date() }]);
    setInput('');
    setIsTyping(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(isAuthenticated ? '/dashboard' : '/');
  };

  return (
    <Layout showFooter={true} noPadding>
      <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4.5rem)] flex flex-col bg-background">
        <div className="container mx-auto px-4 py-4 flex-1 flex flex-col max-w-4xl w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>

              <div className="min-w-0">
                <h1 className="font-bold text-foreground truncate">Career Mentor AI</h1>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>

          <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 animate-fade-in ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        message.role === 'assistant'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'assistant'
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                        {message.content}
                      </div>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'assistant'
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground/70'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.length <= 1 && (
              <div className="px-4 py-3 border-t border-border shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Quick questions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSend(question)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border shrink-0">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Ask me anything about your career..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[48px] max-h-32 resize-none"
                  rows={1}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="bg-gradient-to-br from-primary to-accent hover:opacity-90 transition-opacity self-end"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chatbot;