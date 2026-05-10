// src/pages/InterviewLanding.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, Brain, Trophy, Clock, Target, ChevronRight,
  Sparkles, BookOpen, BarChart3, Shield, Zap, Users,
  Search, CheckCircle, ArrowRight, Play,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { roadmaps } from '@/data/careers';
import type { Difficulty, InterviewMode } from '@/types/interview';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES = [
  {
    value: 'Beginner' as Difficulty,
    emoji: '🌱',
    desc: 'Fundamentals & concepts',
    sub: 'Perfect for starters',
    sel: 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/20',
    unsel: 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5',
    badge: 'text-emerald-400',
  },
  {
    value: 'Intermediate' as Difficulty,
    emoji: '🔥',
    desc: 'Applied problem solving',
    sub: 'For working professionals',
    sel: 'border-yellow-500 bg-yellow-500/10 shadow-yellow-500/20',
    unsel: 'border-border hover:border-yellow-500/50 hover:bg-yellow-500/5',
    badge: 'text-yellow-400',
  },
  {
    value: 'Advanced' as Difficulty,
    emoji: '🚀',
    desc: 'System design & deep expertise',
    sub: 'Senior-level challenges',
    sel: 'border-red-500 bg-red-500/10 shadow-red-500/20',
    unsel: 'border-border hover:border-red-500/50 hover:bg-red-500/5',
    badge: 'text-red-400',
  },
];

const COUNTS = [
  { n: 5,  label: 'Quick',    desc: '~10 min',  icon: '⚡' },
  { n: 8,  label: 'Standard', desc: '~18 min',  icon: '🎯' },
  { n: 10, label: 'Full',     desc: '~25 min',  icon: '🏆' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: Target,   title: 'Pick Your Role',        desc: 'Choose the career path you want to practice for.' },
  { step: '02', icon: Brain,    title: 'Alex Asks Questions',   desc: 'AI-generated, role-specific questions at your chosen difficulty.' },
  { step: '03', icon: Mic,      title: 'Answer Your Way',       desc: 'Type or speak your answers — total flexibility.' },
  { step: '04', icon: BarChart3,title: 'Get Scored & Coached',  desc: 'Instant scoring + improvement tips after every answer.' },
];

const FEATURES = [
  { icon: Brain,    title: 'Real AI Conversations',  desc: 'Natural, contextual questions powered by your AI backend.' },
  { icon: Zap,      title: 'Instant Scoring',        desc: 'Every answer is scored and critiqued in real time.' },
  { icon: Mic,      title: 'Voice or Text',          desc: 'Speak your answers or type them — your choice.' },
  { icon: Clock,    title: 'Timed Pressure',         desc: 'Real interview feel with per-question countdown timers.' },
  { icon: Target,   title: 'Role-Targeted',          desc: 'Questions specific to your chosen career path.' },
  { icon: BarChart3,title: 'Detailed Reports',       desc: 'Full breakdown with scores, feedback and tips.' },
  { icon: Shield,   title: 'Safe to Fail',           desc: "Make mistakes here so you won't in real life." },
  { icon: Users,    title: 'All Levels Welcome',     desc: 'From first-timers to senior professionals.' },
];

const TRUST_CHIPS = [
  '✅ Personalized by role',
  '✅ Beginner to advanced',
  '✅ Voice & text support',
  '✅ Instant AI scoring',
  '✅ No sign-up needed',
  '✅ Private practice space',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InterviewLanding() {
  const navigate = useNavigate();

  const [career,    setCareer]    = useState('');
  const [diff,      setDiff]      = useState<Difficulty>('Beginner');
  const [count,     setCount]     = useState(5);
  const [inputMode, setInputMode] = useState<InterviewMode>('text');
  const [search,    setSearch]    = useState('');

  const selected    = roadmaps.find((r) => r.id === career);
  const canStart    = career !== '';

  const filteredRoadmaps = useMemo(() =>
    roadmaps.filter((r) =>
      r.title.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const selectedDiff   = DIFFICULTIES.find((d) => d.value === diff)!;
  const selectedCount  = COUNTS.find((c) => c.n === count)!;

  const handleStart = () => {
    if (!canStart || !selected) return;
    navigate(`/interview/${career}/session`, {
      state: {
        careerId:      career,
        careerTitle:   selected.title,
        difficulty:    diff,
        questionCount: count,
        mode:          inputMode,
      },
    });
  };

  return (
    <Layout>
      {/* ── Ambient background ────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">

        {/* ═══════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════════ */}
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Mock Interview Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-5 leading-tight tracking-tight">
            Practice Interviews{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-400">
              That Feel Real
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
            Meet <strong className="text-foreground">Alex</strong> — your personal AI interviewer. Answer
            voice or text questions, get instant scores, and know exactly what to improve before
            the real interview.
          </p>

          {/* Trust chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {TRUST_CHIPS.map((chip) => (
              <span
                key={chip}
                className="text-xs bg-muted/60 border border-border rounded-full px-3 py-1 text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Quick start CTA */}
          <button
            onClick={() => document.getElementById('configure')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-purple-500 text-white font-semibold px-8 py-3.5 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-200 text-sm"
          >
            <Play className="w-4 h-4" />
            Start Free Practice
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            HOW IT WORKS
        ════════════════════════════════════════════════════════════ */}
        <div className="mb-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
            How It Works
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative flex flex-col items-start gap-3 bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-center gap-3 w-full">
                  <span className="text-xs font-bold text-primary/60 font-mono">{step}</span>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            FEATURES GRID
        ════════════════════════════════════════════════════════════ */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card/50 border border-border rounded-2xl p-4 flex gap-3 items-start hover:border-primary/40 hover:bg-card transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs mb-0.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            CONFIGURE CARD
        ════════════════════════════════════════════════════════════ */}
        <div
          id="configure"
          className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl shadow-black/10"
        >
          {/* Card header */}
          <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b border-border px-6 md:px-10 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">Configure Your Session</h2>
              <p className="text-sm text-muted-foreground">4 quick steps — then you're live with Alex.</p>
            </div>
            {canStart && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Ready to start
              </div>
            )}
          </div>

          <div className="px-6 md:px-10 py-8 space-y-10">

            {/* ── Step 1: Career ──────────────────────────────────── */}
            <div>
              <StepLabel n={1} title="Choose Your Career Path" required />

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {/* Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scroll">
                {filteredRoadmaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-3 py-4 text-center">
                    No roles found for "{search}"
                  </p>
                ) : (
                  filteredRoadmaps.map((r) => {
                    const Icon = r.icon;
                    const sel  = career === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setCareer(r.id)}
                        aria-pressed={sel}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          sel
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                            : 'border-border hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center text-white shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${sel ? 'text-primary' : 'text-foreground'}`}>
                            {r.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.demand} Demand</p>
                        </div>
                        {sel && <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Step 2: Difficulty ──────────────────────────────── */}
            <div>
              <StepLabel n={2} title="Select Difficulty" />
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map((d) => {
                  const sel = diff === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => setDiff(d.value)}
                      aria-pressed={sel}
                      className={`p-4 rounded-2xl border-2 text-center transition-all ${
                        sel ? `${d.sel} shadow-lg` : d.unsel
                      }`}
                    >
                      <span className="text-3xl block mb-2">{d.emoji}</span>
                      <p className={`font-bold text-sm ${sel ? d.badge : 'text-foreground'}`}>
                        {d.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">{d.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Step 3: Count ───────────────────────────────────── */}
            <div>
              <StepLabel n={3} title="Number of Questions" />
              <div className="flex gap-3">
                {COUNTS.map(({ n, label, desc, icon }) => {
                  const sel = count === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      aria-pressed={sel}
                      className={`flex-1 py-4 px-2 rounded-2xl border-2 text-center transition-all ${
                        sel
                          ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <span className="text-xl block mb-1">{icon}</span>
                      <p className={`text-2xl font-extrabold ${sel ? 'text-primary' : 'text-foreground'}`}>{n}</p>
                      <p className={`text-sm font-semibold ${sel ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Step 4: Mode ────────────────────────────────────── */}
            <div>
              <StepLabel n={4} title="Answer Mode" />
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    v: 'text'  as InterviewMode,
                    Icon: BookOpen,
                    title: 'Type My Answer',
                    sub: 'Keyboard input',
                    tip: 'Great for structured, detailed responses',
                  },
                  {
                    v: 'voice' as InterviewMode,
                    Icon: Mic,
                    title: 'Speak My Answer',
                    sub: 'Microphone input',
                    tip: 'Practice verbal communication skills',
                  },
                ] as const).map(({ v, Icon, title, sub, tip }) => {
                  const sel = inputMode === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setInputMode(v)}
                      aria-pressed={sel}
                      className={`p-5 rounded-2xl border-2 flex items-start gap-4 transition-all text-left ${
                        sel
                          ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                          : 'border-border hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        sel ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${sel ? 'text-primary' : 'text-foreground'}`}>{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1 hidden sm:block">{tip}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Session Preview ─────────────────────────────────── */}
            {canStart && (
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    Session Preview
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Role',       value: selected?.title ?? '—' },
                    { label: 'Difficulty', value: diff },
                    { label: 'Questions',  value: `${count} (${selectedCount.desc})` },
                    { label: 'Mode',       value: inputMode === 'voice' ? '🎙️ Voice' : '⌨️ Text' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA ─────────────────────────────────────────────── */}
            <div className="pt-2">
              <Button
                size="lg"
                className="w-full h-14 text-base rounded-2xl gap-3 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                disabled={!canStart}
                onClick={handleStart}
              >
                <Trophy className="w-5 h-5" />
                Start My Interview with Alex
                <ChevronRight className="w-5 h-5" />
              </Button>
              {!canStart && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  👆 Choose a career path above to unlock your session
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepLabel({
  n, title, required,
}: {
  n: number; title: string; required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      <p className="font-semibold text-foreground">
        {title}
        {required && <span className="text-red-400 ml-1">*</span>}
      </p>
    </div>
  );
}