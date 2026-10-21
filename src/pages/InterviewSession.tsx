import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic, Send, Clock, StopCircle, Volume2, VolumeX,
  AlertTriangle, CheckCircle, SkipForward, LogOut,
  Lightbulb, RefreshCw,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIAvatar } from '@/components/interview/AIAvatar';
import { UserMicVisualizer } from '@/components/interview/UserMicVisualizer';
import { generateQuestion, evaluateAnswer } from '@/lib/interviewAI';
import { getScoreMeta } from '@/lib/scoreUtils';
import type { Difficulty, AvatarState, AnswerRecord } from '@/types/interview';

interface ISpeechRecognitionResultItem {
  transcript: string;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  0: ISpeechRecognitionResultItem;
  length: number;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: ISpeechRecognitionResult;
  };
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
  }
}

const TIME_LIMIT = 120;

const ANSWER_TIPS = [
  'Structure your answer: Context → Action → Result.',
  'Include a concrete example from your experience.',
  'Mention trade-offs or alternatives where relevant.',
  'Use specific technical terminology confidently.',
  'Keep it concise — 2-3 focused paragraphs is ideal.',
  'Start with a direct answer, then explain.',
];

export default function InterviewSession() {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cfg = location.state as {
    careerId: string;
    careerTitle: string;
    difficulty: Difficulty;
    questionCount: number;
    mode: 'text' | 'voice';
  } | null;

  const [phase, setPhase] = useState<'loading' | 'question' | 'answering' | 'evaluating' | 'done'>('loading');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [currentQ, setCurrentQ] = useState('');
  const [qNumber, setQNumber] = useState(1);
  const [answer, setAnswer] = useState('');
  const [transcript, setTranscript] = useState('');
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [prevQs, setPrevQs] = useState<string[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [exitPrompt, setExitPrompt] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recogRef = useRef<ISpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalQ = cfg?.questionCount ?? 5;
  const mode = cfg?.mode ?? 'text';
  const progress = ((qNumber - 1) / totalQ) * 100;
  const wordCount = answer.split(' ').filter(Boolean).length;

  const wordStrength =
    wordCount === 0
      ? null
      : wordCount < 15
      ? { label: 'Too short', color: 'text-red-400' }
      : wordCount < 30
      ? { label: 'Getting there', color: 'text-yellow-400' }
      : wordCount < 60
      ? { label: 'Good length', color: 'text-blue-400' }
      : { label: 'Detailed ✓', color: 'text-emerald-400' };

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsEnabled || !window.speechSynthesis) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.92;
      utt.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes('Google') || v.name.includes('Natural') || v.lang === 'en-US'
      );
      if (preferred) utt.voice = preferred;
      utt.onend = () => onEnd?.();
      setAvatarState('speaking');
      window.speechSynthesis.speak(utt);
    },
    [ttsEnabled]
  );

  useEffect(() => {
    if (!cfg) {
      navigate('/interview');
      return;
    }
    loadNextQuestion(1, [], []);
    const t = setInterval(() => setTipIndex((i) => (i + 1) % ANSWER_TIPS.length), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase !== 'answering') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const loadNextQuestion = async (
    num: number,
    pqs: string[],
    hist: { role: string; content: string }[]
  ) => {
    setPhase('loading');
    setAvatarState('thinking');
    setAnswer('');
    setTranscript('');

    try {
      const question = await generateQuestion(
        cfg!.careerTitle,
        cfg!.difficulty,
        num,
        totalQ,
        pqs,
        hist
      );

      setCurrentQ(question);
      setQNumber(num);
      setPhase('question');

      const newHist = [...hist, { role: 'assistant', content: question }];
      setHistory(newHist);
      setPrevQs([...pqs, question]);

      speak(question, () => {
        setAvatarState('idle');
        setPhase('answering');
        if (mode === 'voice') startListening();
        else textareaRef.current?.focus();
      });
    } catch {
      setCurrentQ('Tell me about a project you are proud of and what you learned from it.');
      setPhase('answering');
      setAvatarState('idle');
    }
  };

  const handleSubmit = async (auto = false) => {
    if (phase === 'evaluating' || phase === 'loading') return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (isListening) stopListening();

    const finalAnswer = (mode === 'voice' ? transcript : answer).trim();
    if (!finalAnswer && !auto) return;

    const timeTaken = TIME_LIMIT - timeLeft;

    setPhase('evaluating');
    setAvatarState('thinking');

    const { score, feedback } = await evaluateAnswer(
      cfg!.careerTitle,
      cfg!.difficulty,
      currentQ,
      finalAnswer || '(No answer provided)'
    );

    const record: AnswerRecord = {
      questionNumber: qNumber,
      question: currentQ,
      answer: finalAnswer || '(No answer provided)',
      aiFeedback: feedback,
      score,
      timeTaken,
    };

    const updated = [...answers, record];
    const updatedHist = [...history, { role: 'user', content: finalAnswer || '(No answer)' }];

    setAnswers(updated);
    setHistory(updatedHist);

    const transitionMessage =
      qNumber >= totalQ
        ? 'Thank you. The interview is now complete. Preparing your final feedback.'
        : 'Thank you. Let’s move to the next question.';

    speak(transitionMessage, () => {
      setTimeout(() => {
        if (qNumber >= totalQ) {
          navigate(`/interview/${careerId}/results`, {
            state: {
              answers: updated,
              difficulty: cfg!.difficulty,
              careerTitle: cfg!.careerTitle,
              mode,
            },
          });
        } else {
          loadNextQuestion(qNumber + 1, prevQs, updatedHist);
        }
      }, 1000);
    });
  };

  const handleSkip = () => {
    setAnswer('');
    setTranscript('');
    handleSubmit(true);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e: ISpeechRecognitionEvent) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setTranscript((p) => p + final);
    };
    r.onend = () => setIsListening(false);
    recogRef.current = r;
    r.start();
    setIsListening(true);
    setAvatarState('listening');
  };

  const stopListening = () => {
    recogRef.current?.stop();
    setIsListening(false);
    setAvatarState('idle');
  };

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 60 ? '#22c55e' : timeLeft > 30 ? '#eab308' : '#ef4444';
  const curAnswer = mode === 'voice' ? transcript : answer;
  const canSubmit = phase === 'answering' && curAnswer.trim().length > 2;

  if (!cfg) return null;

  return (
    <Layout noPadding>
      {exitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-foreground text-lg mb-2">End Interview?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your progress will be lost. Are you sure you want to exit?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setExitPrompt(false)}>
                Keep Going
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                onClick={() => navigate('/interview')}
              >
                Exit Interview
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:block">
            {cfg.careerTitle}
          </span>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground whitespace-nowrap">
              {qNumber}/{totalQ}
            </span>
          </div>
          <button
            onClick={() => {
              setTtsEnabled((v) => !v);
              window.speechSynthesis?.cancel();
            }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={ttsEnabled ? 'Mute Alex' : 'Unmute Alex'}
          >
            {ttsEnabled ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => setExitPrompt(true)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors group"
            title="Exit interview"
          >
            <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
          <div className="flex flex-col items-center gap-5 md:sticky md:top-24">
            <AIAvatar state={avatarState} interviewerName="Alex" />

            <div className="w-full bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Career</span>
                <span className="text-foreground font-medium truncate max-w-[130px]">{cfg.careerTitle}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Difficulty</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {cfg.difficulty}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mode</span>
                <span className="text-foreground font-medium capitalize">
                  {mode === 'voice' ? '🎙️ Voice' : '⌨️ Text'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary font-bold">
                  {qNumber}/{totalQ}
                </span>
              </div>

              {answers.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Questions Completed</p>
                  {answers.map((a) => (
                    <div key={a.questionNumber} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Question {a.questionNumber}</span>
                      <span className="text-emerald-400 font-medium">Done</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {phase === 'answering' && (
              <div className="w-full bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Tip</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {ANSWER_TIPS[tipIndex]}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  Question {qNumber} of {totalQ}
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {cfg.difficulty}
                </Badge>
              </div>

              {phase === 'loading' ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-primary"
                        style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                  <span className="text-muted-foreground text-sm">Alex is preparing your question…</span>
                </div>
              ) : (
                <p className="text-foreground text-lg md:text-xl font-medium leading-relaxed">
                  {currentQ}
                </p>
              )}

              {(phase === 'answering' || phase === 'question') && currentQ && (
                <button
                  onClick={() => speak(currentQ)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Replay question
                </button>
              )}
            </div>

            {(phase === 'answering' || phase === 'evaluating') && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                    />
                  </div>
                  <span
                    className="text-sm font-mono font-bold tabular-nums min-w-[3rem] text-right"
                    style={{ color: timerColor }}
                  >
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                  {timeLeft <= 20 && (
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                  )}
                </div>

                {mode === 'text' ? (
                  <div>
                    <textarea
                      ref={textareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={phase === 'evaluating'}
                      placeholder="Type your answer here… Be specific, use real examples, and take your time."
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground resize-none disabled:opacity-50 transition-all"
                    />
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className={wordStrength?.color ?? 'text-muted-foreground'}>
                        {wordCount} words {wordStrength ? `— ${wordStrength.label}` : ''}
                      </span>
                      <span className="text-muted-foreground">Aim for 30+ words</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="min-h-[130px] bg-background border border-border rounded-xl p-4 relative">
                      {transcript ? (
                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          disabled={phase === 'evaluating'}
                          rows={5}
                          className="w-full bg-transparent text-sm text-foreground leading-relaxed resize-none focus:outline-none"
                          placeholder="Your transcript appears here — you can edit it before submitting."
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {isListening
                            ? '🎙️ Listening… speak your answer now.'
                            : 'Press Start Speaking below and answer out loud.'}
                        </p>
                      )}
                      {isListening && (
                        <div className="absolute top-3 right-3 flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-red-400"
                              style={{
                                height: '16px',
                                animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <UserMicVisualizer isActive={isListening} />
                      {!isListening ? (
                        <Button
                          onClick={startListening}
                          disabled={phase === 'evaluating'}
                          className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Mic className="w-4 h-4" />
                          Start Speaking
                        </Button>
                      ) : (
                        <Button
                          onClick={stopListening}
                          variant="destructive"
                          className="gap-2 rounded-xl"
                        >
                          <StopCircle className="w-4 h-4" />
                          Stop Recording
                        </Button>
                      )}
                    </div>
                    {transcript && (
                      <p className="text-xs text-muted-foreground">
                        ✏️ You can edit the transcript above before submitting.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={phase === 'evaluating'}
                    className="gap-2 rounded-xl text-sm"
                    title="Skip this question"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </Button>

                  <Button
                    onClick={() => handleSubmit(false)}
                    size="lg"
                    disabled={!canSubmit}
                    className="flex-1 rounded-xl gap-2 h-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                  >
                    {phase === 'evaluating' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Alex is reviewing...
                      </>
                    ) : qNumber >= totalQ ? (
                      <>
                        Finish Interview
                        <CheckCircle className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Submit Answer
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {phase === 'loading' && (
              <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px] gap-4">
                <div className="relative">
                  <div className="w-14 h-14 border-2 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-t-primary rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Alex is preparing your question…</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generating a {cfg.difficulty} level question for {cfg.careerTitle}
                  </p>
                </div>
              </div>
            )}

            {phase === 'question' && (
              <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3 min-h-[80px]">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Alex is speaking…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ttsEnabled ? 'Listen carefully, then answer when ready.' : 'Reading the question above.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}