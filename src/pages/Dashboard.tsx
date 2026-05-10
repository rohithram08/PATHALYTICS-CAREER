import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Map,
  MessageCircle,
  Bookmark,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Target,
  Users,
  Mic,
  Brain,
  Trophy,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getActivities, formatTimeAgo, type Activity } from '@/lib/activityTracker';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import {
  getCareerRecommendations,
  type UserPreferences,
} from '@/data/careerRecommendations';

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const recentActivityLimit = 5;

  useEffect(() => {
    if (isAuthenticated) {
      setRecentActivity(getActivities());
    }
  }, [isAuthenticated]);

  const recommendedCareers = useMemo(() => {
    try {
      const storedPreferences = sessionStorage.getItem('careerPreferences');
      if (!storedPreferences) return [];

      const preferences: UserPreferences = JSON.parse(storedPreferences);
      return getCareerRecommendations(preferences)
        .slice(0, 3)
        .map((career) => ({
          id: career.id,
          title: career.title,
          match: Math.min(99, Math.max(60, career.matchScore * 8)),
          growth: career.growth,
        }));
    } catch {
      return [];
    }
  }, []);

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    const features = [
      {
        icon: Sparkles,
        title: 'AI Career Match',
        description:
          'Answer a few quick questions and get personalized career recommendations based on your skills & interests.',
        link: '/signup',
        cta: 'Find My Career',
        color: 'bg-primary/10 text-primary',
      },
      {
        icon: Map,
        title: 'Step-by-Step Roadmaps',
        description:
          'Follow proven learning paths with curated resources, quizzes, and final projects.',
        link: '/signup',
        cta: 'Browse Roadmaps',
        color: 'bg-emerald-500/10 text-emerald-400',
      },
      {
        icon: Mic,
        title: 'AI Mock Interviews',
        description:
          'Practice real interviews with Alex, your AI interviewer. Get instant feedback, scores, and tips to land the job.',
        link: '/signup',
        cta: 'Try Interview',
        color: 'bg-purple-500/10 text-purple-400',
      },
      {
        icon: BookOpen,
        title: 'Expert Insights',
        description:
          'Read articles from industry professionals on career growth, interviews, and trending tech.',
        link: '/blog',
        cta: 'Read Blog',
        color: 'bg-blue-500/10 text-blue-400',
      },
    ];

    const stats = [
      { icon: Users, value: '3', label: 'Team Members' },
      { icon: Map, value: '20+', label: 'Career Roadmaps' },
      { icon: Mic, value: '6', label: 'Core Features' },
      { icon: TrendingUp, value: '5', label: 'Months Built' },
    ];

    const steps = [
      { number: '01', title: 'Tell us about you', desc: 'Share your skills, interests & work style.' },
      { number: '02', title: 'Get matched', desc: 'Receive AI-powered career recommendations.' },
      { number: '03', title: 'Follow the roadmap', desc: 'Learn step-by-step with curated resources.' },
      { number: '04', title: 'Ace the interview', desc: 'Practice with Alex, your personal AI interviewer.' },
    ];

    return (
      <Layout>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI-Powered Career Guidance
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight tracking-tight">
                Discover Your <span className="text-primary">Dream Career</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                Stop guessing what to learn next. Get personalized career recommendations,
                follow step-by-step roadmaps, and ace your interviews with AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                ✨ Free to use · No credit card required
              </p>
            </div>
          </div>
        </section>

        <div className="border-y border-border bg-card/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="py-8 px-6 text-center hover:bg-accent/5 transition-colors">
                  <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground mb-0.5">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">
              What We Offer
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-muted-foreground">
              Four powerful tools to guide your career journey from confused to hired.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                  {f.description}
                </p>
                <Button variant="ghost" asChild className="p-0 h-auto w-fit text-primary hover:text-primary">
                  <Link to={f.link} className="flex items-center gap-1 text-sm font-medium">
                    {f.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <Badge variant="secondary" className="mb-3">
                  <Mic className="w-3 h-3 mr-1" /> New Feature
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Meet Alex — Your AI Interviewer
                </h2>
                <p className="text-muted-foreground mb-6 max-w-lg leading-relaxed">
                  Practice real interview questions for any career, get instant AI
                  feedback on every answer, and walk into your real interview with confidence.
                </p>
                <Button size="lg" asChild>
                  <Link to="/signup">
                    <Mic className="w-4 h-4 mr-2" /> Try AI Interview Free
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 shrink-0">
                {[
                  { icon: Brain, label: 'Real AI Questions' },
                  { icon: Trophy, label: 'Instant Scoring' },
                  { icon: Mic, label: 'Voice or Text' },
                  { icon: Target, label: 'Career-Specific' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col items-center gap-2 text-center min-w-[110px]"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <p className="text-xs font-medium text-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-accent/5 border-y border-border py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">
                How It Works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your career journey in 4 simple steps
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-5">
              {steps.map((s) => (
                <div
                  key={s.number}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors"
                >
                  <span className="text-4xl font-bold text-primary/20">{s.number}</span>
                  <h3 className="text-base font-bold text-foreground mt-3 mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="bg-card border border-primary/20 rounded-2xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <Target className="w-10 h-10 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to take the next step?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Built for students, by students. Start exploring your career path — it takes less than 2 minutes.
              </p>
              <Button size="lg" asChild>
                <Link to="/signup">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const quickActions = [
    {
      icon: Compass,
      title: 'Career Recommendation',
      description: 'Get personalized career suggestions',
      path: '/career-recommendation',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: Map,
      title: 'Career Roadmaps',
      description: 'Explore step-by-step career paths',
      path: '/roadmaps',
      color: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      icon: Mic,
      title: 'AI Interview',
      description: 'Practice with your AI interviewer Alex',
      path: '/interview',
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      icon: MessageCircle,
      title: 'Career Chatbot',
      description: 'Get instant career guidance',
      path: '/chatbot',
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      icon: Bookmark,
      title: 'Saved Careers',
      description: 'View your bookmarked careers',
      path: '/saved-careers',
      color: 'bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">Continue your career exploration journey</p>
        </div>

        <div className="mb-8 bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-foreground text-sm">Meet Alex, your AI Interviewer</p>
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  NEW
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Practice interviews · Get instant AI feedback · Voice or text
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/interview">
              <Trophy className="w-4 h-4 mr-1.5" /> Start Interview
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.path}
              className="group bg-card rounded-2xl p-5 border border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1 leading-tight">
                {action.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground">Top Career Matches</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/career-recommendation" className="text-primary text-xs">
                  {recommendedCareers.length > 0 ? 'View All' : 'Take Assessment'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            {recommendedCareers.length > 0 ? (
              <div className="space-y-3">
                {recommendedCareers.map((career, index) => (
                  <div
                    key={career.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{career.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="text-emerald-500 font-medium">{career.match}% match</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            {career.growth}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/roadmaps/${career.id}`}>Roadmap</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Compass className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  No recommendations yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete your career assessment to unlock personalized career matches.
                </p>
                <Button asChild>
                  <Link to="/career-recommendation">Start Assessment</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-foreground text-sm">Interview Practice</h2>
                <Brain className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Sessions', value: '0', color: 'text-primary' },
                  { label: 'Avg Score', value: '—', color: 'text-emerald-500' },
                  { label: 'Questions', value: '0', color: 'text-amber-500' },
                  { label: 'Best Grade', value: '—', color: 'text-purple-500' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-muted/40 rounded-xl p-3 text-center border border-border"
                  >
                    <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <Button asChild size="sm" className="w-full">
                <Link to="/interview">
                  <Mic className="w-3.5 h-3.5 mr-1.5" /> Start Practicing
                </Link>
              </Button>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground text-sm mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No recent activity yet</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Start exploring careers to build your activity history.
                    </p>
                  </div>
                ) : (
                  recentActivity.slice(0, recentActivityLimit).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground leading-snug">
                          <span className="font-medium">{activity.action}</span>
                          {activity.item ? ` · ${activity.item}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTimeAgo(activity.time)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentActivity.length > recentActivityLimit && (
                <div className="mt-4">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/profile">View All Activity</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;