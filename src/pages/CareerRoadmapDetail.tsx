import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  TrendingUp,
  Briefcase,
  Star,
  Bookmark,
  Trophy,
  ClipboardList,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { roadmaps } from '@/data/careers';
import { trackActivity } from '@/lib/activityTracker';
import { isCareerSaved, toggleSaveCareer } from '@/lib/savedCareers';
import { useToast } from '@/hooks/use-toast';
import StepQuiz from '@/components/StepQuiz';
import { getFinalProjects } from '@/data/finalProjects';
import { useUserLocale } from '@/hooks/useUserLocale';
import { CountrySelector } from '@/components/CountrySelector';
import { getCountryInfo } from '@/lib/locale';
import { localizeSalaryString } from '@/lib/localeSalary';

const CareerRoadmapDetail = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { country } = useUserLocale();

  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem(`roadmap_progress_${careerId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [isSaved, setIsSaved] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'experienced'>('fresher');
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const roadmap = roadmaps.find((r) => r.id === careerId);

  const countryInfo = useMemo(() => getCountryInfo(country), [country]);

  const fresherSalary = useMemo(
    () =>
      roadmap
        ? localizeSalaryString(roadmap.salary, country, 'fresher')
        : 'Not available',
    [roadmap, country]
  );

  const experiencedSalary = useMemo(
    () =>
      roadmap
        ? localizeSalaryString(roadmap.salary, country, 'experienced')
        : 'Not available',
    [roadmap, country]
  );

  useEffect(() => {
    if (roadmap) {
      trackActivity('Viewed', `${roadmap.title} Roadmap`);
      setIsSaved(isCareerSaved(roadmap.id));
    }
  }, [roadmap]);

  useEffect(() => {
    if (roadmap) {
      const firstIncomplete = roadmap.steps.find((s) => !completedSteps.includes(s.id));
      if (firstIncomplete) {
        setExpandedSteps([firstIncomplete.id]);
      }
    }
  }, [roadmap, completedSteps]);

  const handleToggleSave = () => {
    if (!roadmap) return;

    const saved = toggleSaveCareer(roadmap.id);
    setIsSaved(saved);

    toast({
      title: saved ? 'Career saved' : 'Career removed',
      description: saved
        ? `${roadmap.title} added to saved careers.`
        : `${roadmap.title} removed from saved careers.`,
    });
  };

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl) return;

    setLoadingAnalysis(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Analyze this website: ${websiteUrl}` }),
      });

      const data = await res.json();

      try {
        setAnalysisResult(JSON.parse(data.reply));
      } catch {
        setAnalysisResult({ raw: data.reply });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Analysis failed',
        description: 'Could not reach the evaluation server. Please try again.',
        variant: 'destructive',
      });
    }

    setLoadingAnalysis(false);
  };

  if (!roadmap) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Roadmap not found</h1>
          <Button onClick={() => navigate('/roadmaps')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Career Roadmaps
          </Button>
        </div>
      </Layout>
    );
  }

  const toggleStepExpand = (stepId: number) => {
    setExpandedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleQuizPass = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      const updated = [...completedSteps, stepId];
      setCompletedSteps(updated);
      localStorage.setItem(`roadmap_progress_${careerId}`, JSON.stringify(updated));

      const currentIndex = roadmap.steps.findIndex((s) => s.id === stepId);
      const nextStep = roadmap.steps[currentIndex + 1];
      if (nextStep) {
        setExpandedSteps([nextStep.id]);
      }
    }
  };

  const allStepsCompleted = roadmap.steps.every((s) => completedSteps.includes(s.id));
  const progressPercent = Math.round((completedSteps.length / roadmap.steps.length) * 100);
  const IconComponent = roadmap.icon;
  const activeSalary = experienceLevel === 'fresher' ? fresherSalary : experiencedSalary;

  const displayedRoles =
    experienceLevel === 'experienced'
      ? roadmap.experiencedRoles?.length
        ? roadmap.experiencedRoles
        : roadmap.entryLevelRoles
      : roadmap.entryLevelRoles;

  const rolesTitle =
    experienceLevel === 'experienced' ? 'Experienced Job Roles' : 'Entry-Level Job Roles';

  const rolesDescription =
    experienceLevel === 'experienced'
      ? 'Roles you can target after gaining experience in this career path.'
      : 'Roles you can apply for after completing this roadmap.';

  const jobsButtonLabel =
    experienceLevel === 'experienced' ? 'See experienced roles' : 'See open positions';

  return (
    <Layout>
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {roadmap.title}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {completedSteps.length} / {roadmap.steps.length} steps · {progressPercent}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {allStepsCompleted && (
              <Badge className="bg-success text-success-foreground hidden sm:inline-flex shrink-0">
                <Trophy className="w-3 h-3 mr-1" />
                Completed!
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/roadmaps')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmaps
          </Button>
          <CountrySelector />
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-6 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div
              className={`w-16 h-16 rounded-2xl ${roadmap.color} flex items-center justify-center text-white shrink-0`}
            >
              <IconComponent className="w-8 h-8" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{roadmap.title}</h1>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant={isSaved ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleSave}
                    className="gap-1.5"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>

              <p className="text-muted-foreground text-sm md:text-base mb-4">
                {roadmap.description}
              </p>

              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{roadmap.growth} Growth</span>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Briefcase className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{roadmap.demand} Demand</span>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-foreground">
                    {completedSteps.length}/{roadmap.steps.length} Steps
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {roadmap.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="bg-muted/40 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Expected Salary · {countryInfo.name}
                  </p>

                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExperienceLevel('fresher')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        experienceLevel === 'fresher'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fresher
                    </button>

                    <button
                      type="button"
                      onClick={() => setExperienceLevel('experienced')}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        experienceLevel === 'experienced'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Experienced
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-2xl font-bold text-foreground">{activeSalary}</p>
                  <p className="text-xs text-muted-foreground">
                    {experienceLevel === 'fresher' ? '(0–2 yrs)' : '(5+ yrs)'}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  Salary shown in a simplified local format for easier comparison.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 mb-6 animate-fade-in-up">
          <h2 className="text-base font-bold text-foreground mb-1">{rolesTitle}</h2>
          <p className="text-xs text-muted-foreground mb-3">{rolesDescription}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {displayedRoles.map((role) => (
              <Badge key={role} className="bg-primary/10 text-primary border-primary/20 text-xs">
                {role}
              </Badge>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(
                `/jobs?career=${encodeURIComponent(roadmap.title)}&level=${encodeURIComponent(
                  experienceLevel
                )}`
              )
            }
          >
            <Briefcase className="w-4 h-4 mr-2" />
            {jobsButtonLabel}
          </Button>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground mb-1">Learning Path</h2>
          <p className="text-sm text-muted-foreground">
            Pass each step&apos;s quiz to mark it complete and unlock the final project.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-border hidden md:block" />

          <div className="space-y-3">
            {roadmap.steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isExpanded = expandedSteps.includes(step.id);

              return (
                <div
                  key={step.id}
                  className="relative flex gap-4 animate-fade-in-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="hidden md:flex flex-col items-center shrink-0 pt-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all border-2 ${
                        isCompleted
                          ? 'bg-success border-success text-success-foreground'
                          : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="font-bold text-sm">{step.id}</span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex-1 bg-card rounded-2xl border transition-all ${
                      isCompleted ? 'border-success/30' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStepExpand(step.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div
                        className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          isCompleted
                            ? 'bg-success border-success text-success-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-bold">{step.id}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                          {isCompleted && (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.duration}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex flex-wrap gap-1">
                          {step.skills.slice(0, 2).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {step.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{step.skills.length - 2}
                            </Badge>
                          )}
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-5 pt-1 border-t border-border space-y-4">
                        <p className="text-sm text-muted-foreground">{step.description}</p>

                        <div className="flex flex-wrap gap-1.5">
                          {step.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">📚 Resources</p>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {step.resources.map((resource) => (
                              <a
                                key={resource.name}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm transition-all hover:border-primary/50 hover:bg-muted"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-xs truncate">
                                    {resource.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="flex items-center gap-0.5 text-amber-500">
                                      <Star className="w-3 h-3 fill-amber-500" />
                                      <span className="text-xs">{resource.rating}</span>
                                    </span>

                                    <Badge
                                      variant={
                                        resource.type === 'Free'
                                          ? 'default'
                                          : resource.type === 'Paid'
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {resource.type}
                                    </Badge>
                                  </div>
                                </div>

                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>

                        <StepQuiz
                          skills={step.skills}
                          stepId={step.id}
                          careerId={careerId || ''}
                          onPass={() => handleQuizPass(step.id)}
                        />

                        <div className="flex items-center gap-2 pt-1">
                          {isCompleted ? (
                            <div className="flex items-center gap-2 text-success text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Step Completed
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              💡 Pass the quiz (60%+) to mark this step complete.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          {allStepsCompleted ? (
            <div className="bg-card rounded-2xl border-2 border-primary/30 p-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">🎉 Final Project Unlocked!</h2>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve completed all steps. Now apply everything you&apos;ve learned.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {getFinalProjects(careerId || '').map((project, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-muted/30 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
                      <Badge
                        variant={
                          project.difficulty === 'Beginner'
                            ? 'secondary'
                            : project.difficulty === 'Intermediate'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {project.difficulty}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4">{project.description}</p>

                    <div>
                      <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Requirements:
                      </p>

                      <ul className="space-y-1.5">
                        {project.requirements.map((req, rIdx) => (
                          <li
                            key={rIdx}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border-2 border-dashed border-border p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Final Project</h2>
                  <p className="text-sm text-muted-foreground">
                    Complete all {roadmap.steps.length} steps to unlock.{' '}
                    <span className="text-primary font-medium">
                      {roadmap.steps.length - completedSteps.length} remaining.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {allStepsCompleted && (
          <div className="mt-6 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">AI Project Evaluation</h2>
                <p className="text-sm text-muted-foreground">
                  Submit your project URL for instant AI feedback.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <input
                type="url"
                placeholder="https://your-project.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <Button
                onClick={handleAnalyzeWebsite}
                disabled={loadingAnalysis || !websiteUrl}
                className="shrink-0"
              >
                {loadingAnalysis ? 'Evaluating...' : 'Evaluate Project'}
              </Button>
            </div>

            {analysisResult && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-6 space-y-5">
                  {analysisResult.score !== undefined && (
                    <div className="text-center pb-4 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                      <div className="text-5xl font-bold text-primary">
                        {analysisResult.score}
                        <span className="text-2xl text-muted-foreground">/100</span>
                      </div>
                    </div>
                  )}

                  {analysisResult.explanation && (
                    <p className="text-sm text-muted-foreground italic text-center">
                      {analysisResult.explanation}
                    </p>
                  )}

                  {(analysisResult.design ||
                    analysisResult.usability ||
                    analysisResult.requirements ||
                    analysisResult.functionality ||
                    analysisResult.code_quality) && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Design', value: analysisResult.design, icon: '🎨' },
                        { label: 'Usability', value: analysisResult.usability, icon: '🧠' },
                        { label: 'Requirements', value: analysisResult.requirements, icon: '📄' },
                        { label: 'Functionality', value: analysisResult.functionality, icon: '⚙️' },
                        { label: 'Code Quality', value: analysisResult.code_quality, icon: '🔍' },
                      ].map((m) =>
                        m.value !== undefined ? (
                          <div
                            key={m.label}
                            className="bg-card border border-border rounded-xl p-3 text-center"
                          >
                            <div className="text-2xl mb-1">{m.icon}</div>
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                            <p className="font-bold text-foreground">{m.value}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {analysisResult.advantages && (
                      <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                        <h3 className="font-semibold text-success mb-2">✅ Strengths</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {analysisResult.advantages.map((item: string, i: number) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.disadvantages && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                        <h3 className="font-semibold text-destructive mb-2">⚠️ Areas to Improve</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {analysisResult.disadvantages.map((item: string, i: number) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {analysisResult.improvements && (
                    <div className="bg-card border border-border rounded-xl p-4">
                      <h3 className="font-semibold text-foreground mb-2">
                        💡 Recommended Improvements
                      </h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {analysisResult.improvements.map((imp: string, i: number) => (
                          <li key={i}>• {imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.raw && (
                    <div className="bg-muted/50 border border-border rounded-xl p-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {analysisResult.raw}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CareerRoadmapDetail;