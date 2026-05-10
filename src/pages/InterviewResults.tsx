// src/pages/InterviewResults.tsx
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Trophy, RotateCcw, Home, CheckCircle, XCircle,
  TrendingUp, Clock, Target, ChevronDown, ChevronUp,
  Star, Sparkles, BookOpen, Zap, ArrowRight,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { AIAvatar } from '@/components/interview/AIAvatar';
import { generateClosingRemark } from '@/lib/interviewAI';
import { getScoreMeta, getGrade, getReadiness } from '@/lib/scoreUtils';
import type { AnswerRecord, Difficulty } from '@/types/interview';

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 130 }: { score: number; size?: number }) => {
  const r     = size * 0.38;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  const meta  = getScoreMeta(score);

  const strokeColor =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#3b82f6' :
    score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={size * 0.065}
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={size * 0.065}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-extrabold text-foreground leading-none">{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
        <span className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) => (
  <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
    <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
    <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function InterviewResults() {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const state = location.state as {
    answers: AnswerRecord[];
    difficulty: Difficulty;
    careerTitle: string;
    mode: 'text' | 'voice';
    closingRemark?: string;
    usedFallback?: boolean;
   } | null;

  const [expanded,      setExpanded]      = useState<number | null>(0);
  const [closingRemark, setClosingRemark] = useState('');
  const [loadingRemark, setLoadingRemark] = useState(true);
  const [activeTab,     setActiveTab]     = useState<'overview' | 'breakdown'>('overview');

  const answers  = state?.answers ?? [];
  const avgScore = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
    : 0;
  const avgTime  = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.timeTaken, 0) / answers.length)
    : 0;
  const bestScore  = answers.length ? Math.max(...answers.map((a) => a.score)) : 0;
  const worstScore = answers.length ? Math.min(...answers.map((a) => a.score)) : 0;
  const passed     = avgScore >= 60;

  const { grade, label: gradeLabel, color: gradeColor } = getGrade(avgScore);
  const readiness  = getReadiness(avgScore);

  const strongCount = answers.filter((a) => a.score >= 70).length;
  const weakCount   = answers.filter((a) => a.score < 50).length;

  // Strengths and improvements derived from scores
  const meaningfulAnswers = answers.filter(
    (a) =>
        a.answer &&
        !["i don't know", "dont know", "do not know", "no idea", "not sure", "idk", "(no answer provided)"]
        .includes(a.answer.trim().toLowerCase())
    );

    const strengthPoints = [
    strongCount > 0 && `You answered ${strongCount} question${strongCount > 1 ? 's' : ''} with strong performance.`,
    bestScore >= 80 && `Your best answer scored ${bestScore}% — excellent depth shown.`,
    meaningfulAnswers.length >= Math.ceil(answers.length / 2) && avgScore >= 60 && 'You showed effort to engage with most questions using meaningful responses.',
    ].filter(Boolean) as string[];

  const improvePoints = [
    weakCount > 0 && `${weakCount} answer${weakCount > 1 ? 's' : ''} need${weakCount === 1 ? 's' : ''} more depth and detail.`,
    worstScore < 50 && `Your lowest score was ${worstScore}% — review that topic area.`,
    avgScore < 70 && 'Focus on using specific technical terms and concrete examples.',
    avgTime > 90 && 'Try to be more concise — structure helps reduce thinking time.',
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (!answers.length) return;
    generateClosingRemark(
      state?.careerTitle ?? 'this role',
      avgScore,
      answers.map((a) => ({ question: a.question, score: a.score }))
    )
      .then(setClosingRemark)
      .finally(() => setLoadingRemark(false));
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!answers.length) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Results Found</h2>
          <p className="text-muted-foreground text-sm mb-6">
            It looks like this session has no recorded answers. Start a new interview to see your results.
          </p>
          <Button
            onClick={() => navigate('/interview')}
            className="gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-500"
          >
            <ArrowRight className="w-4 h-4" />
            Start an Interview
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-20 ${
            passed ? 'bg-emerald-500' : 'bg-yellow-500'
          }`}
        />
      </div>

      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* ═══════════════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════════════════ */}
        <div className="text-center mb-8">
          {/* Pass/fail badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 border ${
              passed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}
          >
            {passed ? <Trophy className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {passed ? 'Session Passed! 🎉' : 'Keep Practicing! 💪'}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 leading-tight">
            Your Interview Results
          </h1>
          <p className="text-muted-foreground text-sm">
            {state?.careerTitle} &nbsp;·&nbsp; {state?.difficulty} Level &nbsp;·&nbsp; {answers.length} Questions
          </p>

          {/* Readiness pill */}
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold border ${readiness.bg}`}>
            <span className={readiness.color}>{readiness.text}</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            HERO SCORE CARD
        ════════════════════════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 mb-5">
          <div className="flex flex-col md:flex-row items-center gap-8">

            {/* Avatar + grade */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <AIAvatar state="idle" interviewerName="Alex" />
              <div className="text-center">
                <p className={`text-4xl font-extrabold ${gradeColor}`}>{grade}</p>
                <p className="text-sm text-muted-foreground font-medium">{gradeLabel}</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex-1 w-full space-y-5">

              {/* Score ring + stats */}
              <div className="flex items-center gap-5">
                <ScoreRing score={avgScore} />
                <div className="grid grid-cols-2 gap-2.5 flex-1">
                  <StatCard icon={Target}    label="Questions"  value={answers.length} />
                  <StatCard icon={TrendingUp} label="Avg Score"  value={`${avgScore}%`} />
                  <StatCard icon={Clock}     label="Avg Time"   value={`${avgTime}s`}  sub="per question" />
                  <StatCard icon={Star}      label="Best Score" value={`${bestScore}%`} />
                </div>
              </div>

              {/* Alex's closing remark */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">
                    Alex's Feedback
                  </span>
                </div>
                {loadingRemark ? (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                          style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">Alex is writing your feedback…</span>
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{closingRemark}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            STRENGTHS + IMPROVEMENTS
        ════════════════════════════════════════════════════════════ */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {/* Strengths */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Strengths
            </p>
            {strengthPoints.length > 0 ? (
              <ul className="space-y-2">
                {strengthPoints.map((pt, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Complete more answers to see strengths.</p>
            )}
          </div>

          {/* Improvements */}
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Focus Areas
            </p>
            {improvePoints.length > 0 ? (
              <ul className="space-y-2">
                {improvePoints.map((pt, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5 shrink-0">→</span>
                    {pt}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Great job — no major areas to flag!</p>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SCORE CHART
        ════════════════════════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-5">
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            Score Per Question
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Your performance across all {answers.length} questions.
          </p>

          {/* Bar chart */}
          <div className="flex items-end gap-2" style={{ height: '100px' }}>
            {answers.map((a, i) => {
              const meta   = getScoreMeta(a.score);
              const height = Math.max(4, (a.score / 100) * 80);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${meta.color}`}>{a.score}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md ${meta.bar} opacity-90 hover:opacity-100 transition-all cursor-default`}
                      style={{
                        height: `${height}px`,
                        transition: `height 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`,
                      }}
                      title={`Q${i + 1}: ${a.score}%`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Q{i + 1}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
            {[
              { color: 'bg-emerald-500', label: 'Excellent (80+)' },
              { color: 'bg-blue-500',    label: 'Good (60-79)' },
              { color: 'bg-yellow-500',  label: 'Partial (40-59)' },
              { color: 'bg-red-500',     label: 'Needs Work (<40)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            BEST + WORST HIGHLIGHT
        ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            {
              label:   '🏆 Best Answer',
              answer:  [...answers].sort((a, b) => b.score - a.score)[0],
              border:  'border-emerald-500/20 bg-emerald-500/5',
              color:   'text-emerald-400',
            },
            {
              label:   '📈 Most to Improve',
              answer:  [...answers].sort((a, b) => a.score - b.score)[0],
              border:  'border-red-500/20 bg-red-500/5',
              color:   'text-red-400',
            },
          ].map(({ label, answer: a, border, color }) => (
            <div key={label} className={`rounded-2xl border p-4 ${border}`}>
              <p className={`text-xs font-bold mb-2 ${color}`}>{label}</p>
              <p className="text-sm text-foreground line-clamp-2 mb-3 leading-relaxed">
                {a.question}
              </p>
              <p className={`text-2xl font-extrabold ${color}`}>{a.score}%</p>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            DETAILED BREAKDOWN
        ════════════════════════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">

          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-primary" />
                Detailed Breakdown
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap each question to see your answer and Alex's feedback.
              </p>
            </div>
            {/* Expand/collapse all */}
            <button
              onClick={() => setExpanded(expanded !== null ? null : 0)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {expanded !== null ? 'Collapse' : 'Expand first'}
            </button>
          </div>

          <div className="divide-y divide-border">
            {answers.map((a, i) => {
              const meta  = getScoreMeta(a.score);
              const isExp = expanded === i;

              return (
                <div key={i}>
                  {/* Question row */}
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                    onClick={() => setExpanded(isExp ? null : i)}
                    aria-expanded={isExp}
                  >
                    <div className="flex items-center gap-3">
                      {/* Number badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${meta.bg} ${meta.border} ${meta.color}`}
                      >
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {a.question}
                        </p>
                        {/* Score mini bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${meta.bar}`}
                              style={{ width: `${a.score}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${meta.color}`}>
                            {a.score}%
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {a.timeTaken}s
                          </span>
                        </div>
                      </div>

                      {isExp
                        ? <ChevronUp   className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExp && (
                    <div className="px-5 pb-5 space-y-3">

                      {/* Your answer */}
                      <div className="bg-muted/30 rounded-xl p-4 border border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Your Answer
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {a.answer || '(No answer provided)'}
                        </p>
                      </div>

                      {/* AI Feedback */}
                      <div className={`rounded-xl p-4 border ${meta.bg} ${meta.border}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className={`w-4 h-4 ${meta.color}`} />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Alex's Feedback
                          </p>
                          <span className={`ml-auto text-sm font-extrabold ${meta.color}`}>
                            {a.score}/100
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {a.aiFeedback}
                        </p>
                      </div>

                      {/* Verdict */}
                      <div className="flex items-center gap-2">
                        {a.score >= 60
                          ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          : <XCircle     className="w-4 h-4 text-red-400 shrink-0" />
                        }
                        <span className="text-xs text-muted-foreground">
                          {a.score >= 80 ? 'Excellent — strong, well-structured answer.' :
                           a.score >= 60 ? 'Good — covers the main points with minor gaps.' :
                           a.score >= 40 ? 'Partial — basic understanding, but lacks depth.' :
                                          'Needs improvement — review this topic thoroughly.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            NEXT STEPS
        ════════════════════════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-foreground flex items-center gap-2 text-sm mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            Recommended Next Steps
          </h2>
          <div className="space-y-2.5">
            {[
              {
                icon: RotateCcw,
                title:  'Retry This Interview',
                desc:   'Same role, difficulty & question count. Practice makes perfect.',
                action: () =>
                  navigate(`/interview/${careerId}/session`, {
                    state: {
                      careerId,
                      careerTitle:   state?.careerTitle,
                      difficulty:    state?.difficulty,
                      questionCount: answers.length,
                      mode:          state?.mode ?? 'text',
                    },
                  }),
                color: 'hover:border-primary/40 hover:bg-primary/5',
              },
              {
                icon: BookOpen,
                title:  'Study the Roadmap',
                desc:   `Deep-dive into the ${state?.careerTitle} learning path.`,
                action: () => navigate(`/roadmaps/${careerId}`),
                color: 'hover:border-purple-500/40 hover:bg-purple-500/5',
              },
              {
                icon: Home,
                title:  'Try a Different Role',
                desc:   'Switch career path or difficulty for a new challenge.',
                action: () => navigate('/interview'),
                color: 'hover:border-blue-500/40 hover:bg-blue-500/5',
              },
            ].map(({ icon: Icon, title, desc, action, color }) => (
              <button
                key={title}
                onClick={action}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border border-border transition-all text-left group ${color}`}
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ACTION BUTTONS
        ════════════════════════════════════════════════════════════ */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-xl h-11"
            onClick={() => navigate('/interview')}
          >
            <Home className="w-4 h-4" />
            New Interview
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl h-11"
            onClick={() =>
              navigate(`/interview/${careerId}/session`, {
                state: {
                  careerId,
                  careerTitle:   state?.careerTitle,
                  difficulty:    state?.difficulty,
                  questionCount: answers.length,
                  mode:          state?.mode ?? 'text',
                },
              })
            }
          >
            <RotateCcw className="w-4 h-4" />
            Retry Same Config
          </Button>
          <Button
            className="gap-2 rounded-xl h-11 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg shadow-primary/20"
            onClick={() => navigate(`/roadmaps/${careerId}`)}
          >
            <TrendingUp className="w-4 h-4" />
            Study Roadmap
          </Button>
        </div>

      </div>
    </Layout>
  );
}