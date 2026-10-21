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
  Target,
  Mic,
  Brain,
  Trophy,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getActivities, formatTimeAgo, type Activity } from '@/lib/activityTracker';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import {
  getCareerRecommendations,
  type UserPreferences,
} from '@/data/careerRecommendations';
import { userKey } from '@/lib/userStorage';

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
      const scopedKey = userKey('pathalytics_career_preferences');
      const storedPreferences =
        sessionStorage.getItem('careerPreferences') ||
        localStorage.getItem(scopedKey) ||
        localStorage.getItem('pathalytics_career_preferences');
      if (!storedPreferences) return [];

      const preferences: UserPreferences = JSON.parse(storedPreferences);
      return getCareerRecommendations(preferences)
        .slice(0, 3)
        .map((career) => ({
          id: career.id,
          title: career.title,
          readiness: career.readinessPercentage,
          missingSkills: career.missingSkills,
          timeline: career.targetPreparationTimeline,
          growth: career.growth,
        }));
    } catch {
      return [];
    }
  }, []);

  if (isLoading) return <LoadingScreen />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const quickActions = [
    {
      icon: Compass,
      title: 'Career Match Assessment',
      description: 'Find roles matching your exact skills',
      path: '/career-recommendation',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: Map,
      title: 'Interactive Roadmaps',
      description: 'Milestones, quizzes & final capstones',
      path: '/roadmaps',
      color: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      icon: Mic,
      title: 'AI Mock Interview',
      description: 'Practice with Alex, your technical coach',
      path: '/interview',
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      icon: MessageCircle,
      title: 'AI Career Mentor',
      description: 'Context-aware step-by-step guidance',
      path: '/chatbot',
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      icon: Bookmark,
      title: 'Saved Careers',
      description: 'Track bookmarked career directions',
      path: '/saved-careers',
      color: 'bg-amber-500/10 text-amber-400',
    },
    {
      icon: FileText,
      title: 'ATS Resume Builder',
      description: 'Multi-template ATS resume generator with photo toggle',
      path: '/resume-builder',
      color: 'bg-rose-500/10 text-rose-500',
    },
  ];

  const primaryCareer = recommendedCareers[0];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* ── Greeting Header ── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-1">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              Your personalized career readiness & skill acceleration hub
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/resume-builder">
                <FileText className="w-4 h-4 mr-1.5 text-rose-500" /> Resume Builder
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/career-profile">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-primary" /> Candidate Profile
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/career-recommendation">
                <Sparkles className="w-4 h-4 mr-1.5" /> Assessment
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Active Target Role & Skill Gap Highlight ── */}
        {primaryCareer ? (
          <div className="mb-8 bg-gradient-to-r from-card to-muted/30 border border-primary/20 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs bg-primary/90">
                    Primary Target Role
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {primaryCareer.timeline}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {primaryCareer.title}
                </h2>
                {primaryCareer.missingSkills && primaryCareer.missingSkills.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 flex-wrap pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold">Skill Gap to close:</span>
                    {primaryCareer.missingSkills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline" className="text-[11px] border-amber-500/30 text-amber-500 bg-amber-500/5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Core role skills matched! You are ready for mock interviews.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-center">
                  <span className="text-2xl font-black text-primary">{primaryCareer.readiness}%</span>
                  <span className="text-[10px] text-muted-foreground block -mt-1 font-semibold uppercase tracking-wider">
                    Readiness
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link to={`/roadmaps/${primaryCareer.id}`}>
                      Continue Roadmap <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-foreground text-sm">Meet Alex, your AI Technical Interviewer</p>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    PRACTICE
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Practice role-tailored questions · Realistic scoring & feedback · Voice or text
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/interview">
                <Trophy className="w-4 h-4 mr-1.5" /> Start Interview
              </Link>
            </Button>
          </div>
        )}

        {/* ── Quick Actions ── */}
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

        {/* ── Main Grid ── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Matches Column */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-foreground text-base">Top Career Recommendations</h2>
                <p className="text-xs text-muted-foreground">Calibrated against your skills, interests, and demonstrated milestones</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/career-recommendation" className="text-primary text-xs">
                  {recommendedCareers.length > 0 ? 'Retake Assessment' : 'Take Assessment'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            {recommendedCareers.length > 0 ? (
              <div className="space-y-3">
                {recommendedCareers.map((career, index) => (
                  <div
                    key={career.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{career.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="text-primary font-semibold">{career.readiness}% Readiness</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            {career.growth}
                          </span>
                          <span>•</span>
                          <span className="text-muted-foreground/80">{career.timeline}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/roadmaps/${career.id}`}>Roadmap</Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-primary text-xs" asChild>
                        <Link to={`/interview/${career.id}/session`}>
                          <Mic className="w-3.5 h-3.5 mr-1" /> Practice
                        </Link>
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
                  Complete your quick career assessment to unlock personalized recommendations and skill gap analysis.
                </p>
                <Button asChild>
                  <Link to="/career-recommendation">Start Assessment</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Interview Prep & Activity */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-foreground text-sm">AI Interview Readiness</h2>
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Alex evaluates your technical precision, trade-off analysis, and behavioral readiness.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Evaluation Depth', value: 'Technical', color: 'text-primary' },
                  { label: 'Scoring Rubric', value: 'Calibrated', color: 'text-emerald-500' },
                  { label: 'Feedback Mode', value: 'Instant', color: 'text-amber-500' },
                  { label: 'AI Engine', value: 'Alex 2.0', color: 'text-purple-500' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-muted/40 rounded-xl p-3 text-center border border-border"
                  >
                    <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <Button asChild size="sm" className="w-full">
                <Link to="/interview">
                  <Mic className="w-3.5 h-3.5 mr-1.5" /> Start AI Mock Session
                </Link>
              </Button>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground text-sm mb-4">Recent Progress</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground mb-0.5">No recent activity yet</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Complete milestones and quizzes to track your growth here.
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