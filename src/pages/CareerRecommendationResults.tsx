// src/pages/CareerRecommendationResults.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Briefcase,
  Sparkles,
  CheckCircle,
  Brain,
  Heart,
  User,
  ArrowRight,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCareerRecommendations,
  type UserPreferences,
  type RecommendationResult,
} from '@/data/careerRecommendations';
import { trackActivity } from '@/lib/activityTracker';

const CareerRecommendationResults = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedPreferences = sessionStorage.getItem('careerPreferences');

      if (!storedPreferences) {
        setLoadError('Your recommendation session has expired.');
        return;
      }

      const prefs: UserPreferences = JSON.parse(storedPreferences);

      if (!prefs || typeof prefs !== 'object') {
        setLoadError('Your saved preferences could not be read.');
        return;
      }

      setPreferences(prefs);
      setRecommendations(getCareerRecommendations(prefs));
      trackActivity('Completed', 'Career Assessment');
    } catch {
      setLoadError('We could not load your recommendation results.');
    }
  }, []);

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'Very High':
        return 'bg-success/10 text-success border-success/20';
      case 'High':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  const getMatchStrength = (score: number) => {
    if (score >= 10) {
      return { label: 'Excellent Match', color: 'bg-success text-success-foreground' };
    }
    if (score >= 6) {
      return { label: 'Strong Match', color: 'bg-primary text-primary-foreground' };
    }
    if (score >= 3) {
      return { label: 'Good Match', color: 'bg-accent text-accent-foreground' };
    }
    return { label: 'Potential Match', color: 'bg-muted text-muted-foreground' };
  };

  const summarySections = useMemo(() => {
    if (!preferences) return [];
    return [
      {
        key: 'skills',
        label: 'Skills',
        icon: <Brain className="w-4 h-4 text-primary" />,
        items: preferences.skills || [],
        badgeClass: 'text-xs',
        badgeVariant: 'default' as const,
      },
      {
        key: 'interests',
        label: 'Interests',
        icon: <Heart className="w-4 h-4 text-success" />,
        items: preferences.interests || [],
        badgeClass: 'text-xs bg-success/10 text-success',
        badgeVariant: 'secondary' as const,
      },
      {
        key: 'personality',
        label: 'Personality',
        icon: <User className="w-4 h-4 text-accent" />,
        items: preferences.personality || [],
        badgeClass: 'text-xs bg-accent/10 text-accent',
        badgeVariant: 'secondary' as const,
      },
      {
        key: 'workStyle',
        label: 'Work Style',
        icon: <Briefcase className="w-4 h-4 text-foreground" />,
        items: preferences.workStyle || [],
        badgeClass: 'text-xs',
        badgeVariant: 'outline' as const,
      },
    ].filter((section) => section.items.length > 0);
  }, [preferences]);

  if (loadError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto text-center py-10">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Results unavailable
              </h1>
              <p className="text-muted-foreground mb-6">{loadError}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/career-recommendation')}>
                  Take Assessment Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!preferences) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/career-recommendation')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Recommendation Form
          </Button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Your Career Recommendations
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Based on your skills, interests, personality, and work style
              </p>
            </div>
          </div>
        </div>

        {summarySections.length > 0 && (
          <Card className="mb-8 bg-muted/30 border-border">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Your Profile Summary
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summarySections.map((section) => (
                  <div key={section.key}>
                    <div className="flex items-center gap-2 mb-2">
                      {section.icon}
                      <p className="text-xs font-medium text-muted-foreground">
                        {section.label}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {section.items.map((item) => (
                        <Badge
                          key={item}
                          variant={section.badgeVariant}
                          className={section.badgeClass}
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground mb-6">
          Found{' '}
          <span className="font-semibold text-foreground">{recommendations.length}</span>{' '}
          career{recommendations.length !== 1 ? 's' : ''} matching your profile
        </p>

        {recommendations.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {recommendations.map((career, index) => {
              const matchStrength = getMatchStrength(career.matchScore);
              const roadmapPath = career?.id ? `/roadmaps/${career.id}` : '/roadmaps';

              const matchedSections = [
                {
                  icon: <Brain className="w-3.5 h-3.5 text-primary" />,
                  label: 'Matched Skills',
                  items: career.matchedSkills || [],
                  badgeClass: 'bg-primary/10 text-primary border-primary/20',
                  variant: 'default' as const,
                },
                {
                  icon: <Heart className="w-3.5 h-3.5 text-success" />,
                  label: 'Matched Interests',
                  items: career.matchedInterests || [],
                  badgeClass: 'bg-success/10 text-success border-success/20',
                  variant: 'secondary' as const,
                },
                {
                  icon: <User className="w-3.5 h-3.5 text-accent" />,
                  label: 'Matched Personality',
                  items: career.matchedPersonality || [],
                  badgeClass: 'bg-accent/10 text-accent border-accent/20',
                  variant: 'secondary' as const,
                },
                {
                  icon: <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />,
                  label: 'Matched Work Style',
                  items: career.matchedWorkStyle || [],
                  badgeClass: '',
                  variant: 'outline' as const,
                },
              ];

              return (
                <Card
                  key={career.id || `${career.title}-${index}`}
                  className="border-border overflow-hidden animate-fade-in-up flex flex-col hover:border-primary/50 hover:shadow-lg transition-all"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <Badge className={matchStrength.color}>{matchStrength.label}</Badge>
                      <Badge variant="outline" className={getDemandColor(career.demand)}>
                        {career.demand} Demand
                      </Badge>
                    </div>

                    <CardTitle className="text-lg leading-snug">{career.title}</CardTitle>

                    <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">
                      {career.description}
                    </p>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-3 pt-0 px-5 pb-5 flex-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {matchedSections.map((section) => (
                        <div key={section.label} className="min-h-[3.5rem]">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {section.icon}
                            <span className="text-xs font-medium text-muted-foreground">
                              {section.label}
                            </span>
                          </div>

                          {section.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {section.items.map((item) => (
                                <Badge
                                  key={item}
                                  variant={section.variant}
                                  className={`text-xs ${section.badgeClass}`}
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/40 italic">No match</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 h-[7.5rem] overflow-y-auto">
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        Why This Career?
                      </h4>
                      <ul className="space-y-1">
                        {(career.explanation || []).map((exp, i) => (
                          <li
                            key={i}
                            className="text-xs text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-auto space-y-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <DollarSign className="w-4 h-4 mx-auto text-success mb-1" />
                          <p className="text-xs text-muted-foreground">Fresher</p>
                          <p className="text-xs font-semibold text-foreground">
                            {career.salaryDisplay?.fresher || 'N/A'}
                          </p>
                        </div>

                        <div className="text-center">
                          <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
                          <p className="text-xs text-muted-foreground">Growth</p>
                          <p className="text-xs font-semibold text-foreground">
                            {career.growth || 'N/A'}
                          </p>
                        </div>

                        <div className="text-center">
                          <Briefcase className="w-4 h-4 mx-auto text-accent mb-1" />
                          <p className="text-xs text-muted-foreground">Demand</p>
                          <p className="text-xs font-semibold text-foreground">
                            {career.demand || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1 py-1.5 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Experienced Salary</p>
                        <p className="text-xs font-semibold text-foreground">
                          {career.salaryDisplay?.experienced || 'N/A'}
                        </p>
                      </div>

                      <Button className="w-full" asChild>
                        <Link to={roadmapPath}>
                          View Career Roadmap <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Matches Found</h3>
              <p className="text-muted-foreground mb-4">
                We could not find careers matching your current selections. Try adjusting your preferences.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/career-recommendation')} variant="outline">
                  Update Your Preferences
                </Button>
                <Button onClick={() => navigate('/roadmaps')}>
                  Explore All Roadmaps
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default CareerRecommendationResults;