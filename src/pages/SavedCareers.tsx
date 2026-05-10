import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, TrendingUp, Wallet, ChevronRight } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getSavedCareers, removeSavedCareer, SavedCareerEntry } from '@/lib/savedCareers';
import { roadmaps } from '@/data/careers';
import { useUserLocale } from '@/hooks/useUserLocale';
import { localizeSalaryString } from '@/lib/localeSalary';
import { CountrySelector } from '@/components/CountrySelector';
import { getCountryInfo } from '@/lib/locale';

const SavedCareers = () => {
  const [savedEntries, setSavedEntries] = useState<SavedCareerEntry[]>(getSavedCareers);
  const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'experienced'>('fresher');
  const { toast } = useToast();
  const { country } = useUserLocale();
  const countryInfo = getCountryInfo(country);

  const savedRoadmaps = savedEntries
    .map((entry) => {
      const roadmap = roadmaps.find((r) => r.id === entry.id);
      return roadmap ? { ...roadmap, savedAt: entry.savedAt } : null;
    })
    .filter(Boolean) as (typeof roadmaps[number] & { savedAt: string })[];

  const handleRemove = (id: string, title: string) => {
    removeSavedCareer(id);
    setSavedEntries(getSavedCareers());
    toast({
      title: 'Career removed',
      description: `${title} has been removed from your saved list.`,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header with country selector */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Saved Careers</h1>
            <p className="text-muted-foreground">
              Your bookmarked careers for future reference.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CountrySelector />
          </div>
        </div>

        {savedRoadmaps.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing salaries in <strong className="text-foreground">{countryInfo.currency}</strong> for:
            </span>
            <Button
              variant={experienceLevel === 'fresher' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExperienceLevel('fresher')}
              className="rounded-full"
            >
              👶 Fresher
            </Button>
            <Button
              variant={experienceLevel === 'experienced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExperienceLevel('experienced')}
              className="rounded-full"
            >
              💼 Experienced
            </Button>
          </div>
        )}

        {savedRoadmaps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No saved careers yet</h3>
            <p className="text-muted-foreground mb-6">
              Go to Career Roadmaps and bookmark your favorites.
            </p>
            <Button asChild>
              <Link to="/roadmaps">Explore Roadmaps</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRoadmaps.map((roadmap, index) => {
              const IconComponent = roadmap.icon;
              const localSalary = localizeSalaryString(
                roadmap.salary,
                country,
                experienceLevel
              );

              return (
                <div
                  key={roadmap.id}
                  className="bg-card rounded-2xl border border-border p-6 card-hover animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${roadmap.color} flex items-center justify-center text-white`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Saved
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleRemove(roadmap.id, roadmap.title)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-2">{roadmap.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{roadmap.description}</p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Wallet className="w-4 h-4 text-success" />
                      <span className="text-muted-foreground font-medium">{localSalary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">{roadmap.growth}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    Saved {new Date(roadmap.savedAt).toLocaleDateString()}
                  </p>

                  <Button variant="outline" className="w-full gap-2" asChild>
                    <Link to={`/roadmaps/${roadmap.id}`}>
                      View Roadmap
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SavedCareers;