// src/pages/About.tsx
import { Link } from 'react-router-dom';
import {
  lazy,
  Suspense,
  memo,
  useEffect,
  useState,
} from 'react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Target, Eye, Zap, Heart, TrendingUp, Users,
  MapPin, Shield, Mic, MessageSquare, Briefcase,
  Bookmark, ArrowRight, Cpu, CheckCircle2,
  ExternalLink,
} from 'lucide-react';

// ─── Data (move to src/data/about.data.ts in production) ───────────────────

const STATS = [
  { number: '3',   label: 'Team Members',      title: '3 passionate final-year students' },
  { number: '6',   label: 'Core Features',     title: 'Recommendation, Roadmap, Alex, Chatbot, Jobs, Dashboard' },
  { number: '5',   label: 'Months Built',      title: 'Jan 2026 – May 2026' },
  { number: '40+', label: 'Industry Sectors',  title: 'Covering tech, healthcare, finance, and more' },
  { number: '24/7', label: 'AI Support',       title: 'Career Chatbot available around the clock' },
];

const VALUES = [
  { icon: Target,      title: 'Accessibility', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', desc: "Career guidance should be free from barriers — for every background, skill level, and ambition." },
  { icon: Eye,         title: 'Transparency',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   desc: 'We explain AI recommendations in plain language so you always understand the "why" behind your path.' },
  { icon: Zap,         title: 'Innovation',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'We continuously evolve our AI models and UX to stay ahead of a rapidly changing job market.' },
  { icon: Shield,      title: 'Trust',         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', desc: 'Your data is yours. We operate with the highest standards of privacy and never sell your information.' },
  { icon: Heart,       title: 'Empathy',       color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20',   desc: 'Career transitions are personal. We design every interaction with compassion and genuine care.' },
  { icon: TrendingUp,  title: 'Impact',        color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   desc: 'Success means people who found their calling with Pathalytics — not just metrics on a dashboard.' },
];

const FEATURES = [
  { icon: Cpu,          title: 'AI Career Recommendations', tag: 'Powered by AI',  desc: 'Our ML engine analyzes your skills, personality, and goals to surface career paths tailored to you.' },
  { icon: MapPin,       title: 'Step-by-Step Roadmaps',     tag: 'Interactive',    desc: 'Visual, milestone-based roadmaps break down exactly what skills and experiences you need.' },
  { icon: Mic,          title: 'AI Interview Coach — Alex', tag: 'New',            desc: 'Practice real interview scenarios with Alex. Get instant feedback on answers and confidence.' },
  { icon: MessageSquare,title: 'Career Chatbot',            tag: '24/7',           desc: 'Ask anything, anytime. Instant career guidance and personalized advice around the clock.' },
  { icon: Briefcase,    title: 'Live Job Board',            tag: 'Real-Time',      desc: 'Browse curated listings matched to your profile, with direct apply links and salary insights.' },
  { icon: Bookmark,     title: 'Saved Careers & Tracking',  tag: 'Dashboard',      desc: 'Bookmark careers and track your roadmap progress in your personal dashboard.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Assess Your Skills', desc: 'Answer a short AI-powered questionnaire about your skills, interests, and goals.' },
  { step: '02', title: 'Get Your Roadmap',   desc: 'Receive a personalized career path with milestones, resources, and timelines.' },
  { step: '03', title: 'Practice & Apply',   desc: 'Use Alex for interview prep and browse matched jobs on the live job board.' },
];

const TEAM = [
  {
    initials: 'RR', name: 'Rohith Ram H', role: 'Data Engineer & Project Lead',
    gradient: 'from-violet-600 to-blue-600',
    tags: ['Data Engineering', 'JLPT N4 Certified', 'Open to Japan & India'],
    badge: '⭐ Core Lead', badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    desc: 'Led the full project lifecycle, applying data engineering concepts and driving key platform improvements end-to-end.',
  },
  {
    initials: 'SS', name: 'Sathish S', role: 'AI + Full Stack Developer',
    gradient: 'from-emerald-600 to-blue-600',
    tags: ['Artificial Intelligence', 'Full Stack Development'],
    badge: '🧠 Key Contributor', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    desc: "Architected the AI-driven core and shaped the platform's feature direction from concept to production.",
  },
  {
    initials: 'PV', name: 'Perarulalan V', role: 'Java Full Stack Developer & QA',
    gradient: 'from-amber-500 to-rose-600',
    tags: ['Java Full Stack', 'QA Specialist'],
    badge: '🛡️ QA Specialist', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    desc: 'Built core modules and enforced quality standards as the dedicated QA Specialist for the platform.',
  },
];

const TIMELINE = [
  { year: 'Jan 2026',          title: 'The Idea',          desc: 'Pathalytics was conceptualized to address the career guidance gap for students using AI.' },
  { year: 'Feb 2026',          title: 'Research & Planning',desc: 'User research conducted; platform scope defined across all six core modules.' },
  { year: 'Mar 2026',          title: 'Core Development',   desc: 'Built the AI Recommendation engine, Step-by-Step Roadmaps, and the 24/7 Career Chatbot.' },
  { year: 'Apr 2026',          title: 'Alex & Job Board',   desc: 'Shipped Alex — the AI Interview Coach — and integrated the Live Job Board.' },
  { year: 'May 2026',          title: 'QA & Final Polish',  desc: 'End-to-end testing, performance tuning, and UI refinement for production readiness.' },
  { year: 'May 2026 — Present', title: 'Final Submission',  desc: 'Pathalytics submitted as a fully functional AI career guidance capstone platform.' },
];

// ─── Sub-components (memoized for performance) ─────────────────────────────

const StatItem = memo(({ number, label, title }: typeof STATS[0]) => (
  <div
    title={title}
    className="py-8 px-6 text-center hover:bg-accent/5 transition-colors cursor-default"
  >
    <p className="text-3xl font-bold text-primary mb-1">{number}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
));

const ValueCard = memo(({ icon: Icon, title, color, bg, desc }: typeof VALUES[0]) => (
  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200">
    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg} ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <h4 className="font-bold text-foreground mb-2">{title}</h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </div>
));

const FeatureCard = memo(({ icon: Icon, title, desc, tag }: typeof FEATURES[0]) => (
  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex gap-4">
    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <h4 className="font-bold text-foreground text-sm">{title}</h4>
        <Badge variant="secondary" className="text-xs px-2 py-0">{tag}</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </div>
));

const TeamCard = memo(({ initials, name, role, desc, gradient, tags, badge, badgeColor }: typeof TEAM[0]) => (
  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200 flex flex-col gap-4">
    <div className="flex items-start gap-4">
      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-border`}>
        {initials}
      </div>
      <div className="min-w-0">
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1.5 ${badgeColor}`}>{badge}</span>
        <h4 className="font-bold text-foreground leading-tight">{name}</h4>
        <p className="text-xs text-primary font-semibold mt-0.5">{role}</p>
      </div>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
      {tags.map((tag) => (
        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
          {tag}
        </span>
      ))}
    </div>
  </div>
));

// ─── Page Component ────────────────────────────────────────────────────────

const About = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  return (
    <Layout>

      {/* ── HERO ── */}
      <section className="relative text-center py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-5">Our Story</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Empowering Every Career
            <br />
            <span className="text-primary">with the Power of AI</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Pathalytics is an AI-driven career guidance platform helping students, professionals,
            and career changers discover, plan, and pursue their ideal path — with data-backed clarity.
          </p>

          {/* Guard CTA against auth flash */}
          {!isAuthLoading && (
            <div className="flex gap-3 justify-center flex-wrap">
              {isAuthenticated ? (
                <>
                  <Button asChild size="lg" data-track="hero-dashboard">
                    <Link to="/dashboard">Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" data-track="hero-explore">
                    <Link to="/career-recommendation">Explore Careers <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" data-track="hero-get-started">
                    <Link to="/career-recommendation">Get Started Free <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" data-track="hero-mission">
                    <a href="#mission" onClick={(e) => { e.preventDefault(); document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' }); }}>
                      Learn Our Mission <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="border-y border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border">
            {STATS.map((s) => <StatItem key={s.label} {...s} />)}
          </div>
        </div>
      </div>

      {/* ── MISSION ── */}
      <section className="container mx-auto px-4 py-20" id="mission">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Our Mission</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 leading-tight">
              Career Clarity for Everyone, Everywhere
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We believe the right career guidance shouldn't be reserved for the privileged few.
              Pathalytics was born from a simple idea: every person deserves a clear, personalized
              roadmap to a fulfilling career.
            </p>
            <ul className="space-y-3 mb-8">
              {['Personalized AI career recommendations', 'Visual step-by-step roadmaps', 'Real-time interview coaching with Alex', 'Live job board matched to your profile'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild data-track="mission-explore">
              <Link to="/career-recommendation">Explore Career Paths <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {/* How it Works — replaces filler card */}
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <p className="text-xs font-bold tracking-widest text-primary uppercase">How It Works</p>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 items-start">
                <span className="text-2xl font-black text-primary/20 leading-none w-8 shrink-0">{step}</span>
                <div>
                  <h4 className="font-bold text-foreground text-sm mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-accent/5 border-y border-border py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Our Values</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What We Stand For</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              These principles guide every product decision, feature, and interaction on Pathalytics.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v) => <ValueCard key={v.title} {...v} />)}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="container mx-auto px-4 py-20" id="features">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Platform Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From career discovery to interview prep — your all-in-one AI career platform.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="bg-accent/5 border-y border-border py-20 px-4" id="team">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">The Team</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built by People Who Care</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A trio of final-year students combining data engineering, AI, full-stack development,
              and QA to build Pathalytics as their capstone project.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map((m) => <TeamCard key={m.name} {...m} />)}
          </div>
          {/* Social proof */}
          <p className="text-center text-xs text-muted-foreground mt-10 border-t border-border pt-6">
            Final Year Capstone Project · Computer Science & Engineering · 2026
          </p>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Our Journey</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">From Idea to Impact</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            How Pathalytics was conceived, built, and refined over five focused months.
          </p>
        </div>
        {/* Single-column vertical timeline */}
        <div className="max-w-2xl mx-auto">
          {TIMELINE.map(({ year, title, desc }, i) => (
            <div
              key={`${title}-${i}`}
              className="relative pl-10 pb-10 border-l-2 border-border last:border-l-transparent"
            >
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background" />
              <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1">{year}</p>
              <h4 className="font-bold text-foreground mb-1.5">{title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </Layout>
  );
};

export default About;