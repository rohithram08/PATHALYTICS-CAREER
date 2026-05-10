// src/pages/CareerRecommendationInput.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Brain, Heart, Briefcase, User, ChevronRight, Check,
  Trash2, Search, X, Lightbulb, ArrowRight,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  skills, interests, personalities, workStyles, type UserPreferences,
} from '@/data/careerRecommendations';

const STORAGE_KEY = 'careerRecommendation_draft';

const CareerRecommendationInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
  const [selectedWorkStyle, setSelectedWorkStyle] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isCTAVisible, setIsCTAVisible] = useState(true);

  // ✅ Mounted guard — prevents auto-save firing on unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const skillsRef = useRef<HTMLDivElement>(null);
  const interestsRef = useRef<HTMLDivElement>(null);
  const personalityRef = useRef<HTMLDivElement>(null);
  const workStyleRef = useRef<HTMLDivElement>(null);

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSelectedSkills(parsed.skills || []);
        setSelectedInterests(parsed.interests || []);
        setSelectedPersonality(parsed.personality || []);
        setSelectedWorkStyle(parsed.workStyle || []);
        const total =
          (parsed.skills?.length || 0) +
          (parsed.interests?.length || 0) +
          (parsed.personality?.length || 0) +
          (parsed.workStyle?.length || 0);
        if (total > 0) {
          setHasLoadedDraft(true);
          toast({
            title: '✨ Welcome back!',
            description: `${total} selection${total !== 1 ? 's' : ''} restored.`,
          });
        }
      } catch { /* ignore */ }
    }
  }, [toast]);

  // ✅ Auto-save with mounted guard
  useEffect(() => {
    if (!isMountedRef.current) return;

    const total =
      selectedSkills.length + selectedInterests.length +
      selectedPersonality.length + selectedWorkStyle.length;

    if (total > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        skills: selectedSkills,
        interests: selectedInterests,
        personality: selectedPersonality,
        workStyle: selectedWorkStyle,
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedSkills, selectedInterests, selectedPersonality, selectedWorkStyle]);

  // Hide sticky CTA near footer
  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      setIsCTAVisible(footerTop > window.innerHeight - 80);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    {
      key: 'skills',
      title: 'Your Skills',
      subtitle: 'What are you good at?',
      icon: Brain,
      color: 'text-primary',
      bg: 'bg-primary/10',
      borderColor: 'border-primary/30',
      selectedBg: 'bg-primary text-primary-foreground',
      items: skills,
      selected: selectedSkills,
      setter: setSelectedSkills,
      ref: skillsRef,
    },
    {
      key: 'interests',
      title: 'Your Interests',
      subtitle: 'What excites and energizes you?',
      icon: Heart,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      selectedBg: 'bg-rose-500 text-white',
      items: interests,
      selected: selectedInterests,
      setter: setSelectedInterests,
      ref: interestsRef,
    },
    {
      key: 'personality',
      title: 'Your Personality',
      subtitle: 'How would you describe yourself?',
      icon: User,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      selectedBg: 'bg-violet-500 text-white',
      items: personalities,
      selected: selectedPersonality,
      setter: setSelectedPersonality,
      ref: personalityRef,
    },
    {
      key: 'workStyle',
      title: 'Your Work Style',
      subtitle: "What's your ideal environment?",
      icon: Briefcase,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      selectedBg: 'bg-amber-500 text-white',
      items: workStyles,
      selected: selectedWorkStyle,
      setter: setSelectedWorkStyle,
      ref: workStyleRef,
    },
  ];

  const totalSelected =
    selectedSkills.length + selectedInterests.length +
    selectedPersonality.length + selectedWorkStyle.length;

  const completedSections = sections.filter((s) => s.selected.length > 0).length;
  const completionPercent = (completedSections / sections.length) * 100;

  const toggleItem = (item: string, section: typeof sections[0]) => {
    if (section.selected.includes(item)) {
      section.setter(section.selected.filter((s) => s !== item));
    } else {
      section.setter([...section.selected, item]);
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const offsetPosition = ref.current.getBoundingClientRect().top + window.pageYOffset - 180;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // ✅ Fixed handleSubmit — save first, verify, then navigate
  const handleSubmit = () => {
    if (totalSelected === 0) {
      toast({
        title: 'No selections yet',
        description: 'Pick at least one option to get recommendations.',
        variant: 'destructive',
      });
      return;
    }

    const preferences: UserPreferences = {
      skills: selectedSkills,
      interests: selectedInterests,
      personality: selectedPersonality,
      workStyle: selectedWorkStyle,
    };

    // ✅ Save FIRST
    sessionStorage.setItem('careerPreferences', JSON.stringify(preferences));

    // ✅ Verify it actually saved
    const saved = sessionStorage.getItem('careerPreferences');
    if (!saved) {
      toast({
        title: 'Something went wrong',
        description: 'Could not save preferences. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // ✅ Clear draft AFTER saving
    localStorage.removeItem(STORAGE_KEY);

    // ✅ Navigate last
    navigate('/career-recommendation/results');
  };

  const handleClearAll = () => {
    setSelectedSkills([]);
    setSelectedInterests([]);
    setSelectedPersonality([]);
    setSelectedWorkStyle([]);
    setSearchQuery('');
    localStorage.removeItem(STORAGE_KEY);
    setHasLoadedDraft(false);
    toast({ title: 'Cleared', description: 'All selections removed.' });
  };

  const filterItems = (items: readonly string[]): string[] =>
    !searchQuery.trim()
      ? [...items]
      : items.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()));

  const ctaLabel =
    totalSelected === 0
      ? 'Select something to begin'
      : totalSelected < 3
      ? `${totalSelected} selected · Add a few more!`
      : totalSelected < 8
      ? `${totalSelected} selected · Looking good 👍`
      : `${totalSelected} selected · Great profile! 🎯`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-5xl">

        {/* ── Page Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary mb-4 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Career Match
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Find Your Perfect Career
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tell us about yourself by selecting what resonates with you. The more you pick, the better your matches. ✨
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-xl mx-auto">
          {[
            { step: '1', label: 'Select your traits' },
            { step: '2', label: 'We analyse your profile' },
            { step: '3', label: 'Get career matches' },
          ].map(({ step, label }, i) => (
            <div key={step} className="flex flex-col items-center text-center gap-1.5 relative">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                {step}
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              {i < 2 && (
                <ArrowRight className="absolute -right-2 top-2 w-3.5 h-3.5 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>

        {/* ── Draft restored notice ── */}
        {hasLoadedDraft && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
            <p className="text-sm text-foreground">
              ✨ Your previous selections were restored. Continue where you left off!
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHasLoadedDraft(false)}
              className="text-muted-foreground shrink-0 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── Sticky Progress Bar + Quick Nav ── */}
        <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-md -mx-4 px-4 py-3 mb-6 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-0.5 scrollbar-thin">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = s.selected.length > 0;
                return (
                  <button
                    key={s.key}
                    onClick={() => scrollToSection(s.ref)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? `${s.bg} ${s.color} border ${s.borderColor}`
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {s.title.replace('Your ', '')}
                    {isActive && (
                      <span className="bg-background/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {s.selected.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {completedSections}/{sections.length} sections ·{' '}
                    <span className="font-semibold text-foreground">{totalSelected} selected</span>
                  </span>
                  <span>{Math.round(completionPercent)}%</span>
                </div>
                <Progress value={completionPercent} className="h-1.5" />
              </div>
              {totalSelected > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-muted-foreground shrink-0 h-8 px-2 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Clear All</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search skills, interests, personality traits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── 2×2 Category Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {sections.map((section) => {
            const SIcon = section.icon;
            const filteredItems = filterItems(section.items);
            const hasResults = filteredItems.length > 0;
            const isCompleted = section.selected.length > 0;

            return (
              <Card
                key={section.key}
                ref={section.ref}
                className={`border-2 scroll-mt-44 transition-all duration-200 flex flex-col ${
                  isCompleted
                    ? `${section.borderColor} shadow-sm`
                    : 'border-border hover:border-border/60'
                }`}
              >
                <CardContent className="p-5 md:p-6 flex-1 flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
                      <SIcon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-foreground">{section.title}</h2>
                        {isCompleted && (
                          <Badge variant="secondary" className={`${section.bg} ${section.color} text-xs border-0`}>
                            <Check className="w-3 h-3 mr-1" />
                            {section.selected.length} picked
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                    </div>
                    {isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => section.setter([])}
                        className="text-muted-foreground h-7 w-7 p-0 shrink-0"
                        title={`Clear ${section.title}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Tags */}
                  {hasResults ? (
                    <div className="flex flex-wrap gap-2 flex-1 content-start">
                      {filteredItems.map((item) => {
                        const isSelected = section.selected.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleItem(item, section)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 min-h-[36px] ${
                              isSelected
                                ? `${section.selectedBg} shadow-sm scale-105`
                                : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:scale-105'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground italic text-center">
                        No matches for "<span className="font-medium">{searchQuery}</span>" in {section.title.replace('Your ', '')}
                      </p>
                    </div>
                  )}

                  {!isCompleted && !searchQuery && (
                    <p className="text-[11px] text-muted-foreground/60 mt-3 italic">
                      Tap any tag to select it
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Pro Tip ── */}
        {totalSelected > 0 && totalSelected < 4 && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">Pick more for better matches!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Selecting across all four categories gives the AI a fuller picture of you — leading to more accurate and personalized career recommendations.
              </p>
            </div>
          </div>
        )}

        {/* ── All sections done ── */}
        {completedSections === sections.length && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">All sections filled!</span> You're ready to see your career matches.
            </p>
          </div>
        )}

        <div className="h-24" />

        {/* ── Sticky Bottom CTA ── */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-lg transition-transform duration-300 ${
            isCTAVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{ctaLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedSections === 0
                  ? 'Start by tapping any tag above'
                  : completedSections < sections.length
                  ? `${sections.length - completedSections} section${sections.length - completedSections !== 1 ? 's' : ''} left`
                  : 'All sections complete 🎉'}
              </p>
            </div>
            <div className="sm:hidden flex-1">
              <p className="text-xs font-semibold text-foreground">
                {totalSelected} selected · {completedSections}/{sections.length} sections
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={totalSelected === 0}
              className="shrink-0 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {totalSelected === 0 ? 'Select to Continue' : 'Get My Recommendations'}
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default CareerRecommendationInput;