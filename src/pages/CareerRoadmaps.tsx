import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, ChevronRight, Bookmark, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { roadmaps } from '@/data/careers';
import { isCareerSaved, toggleSaveCareer } from '@/lib/savedCareers';
import { useToast } from '@/hooks/use-toast';
import { useUserLocale } from '@/hooks/useUserLocale';
import { localizeSalaryString } from '@/lib/localeSalary';
import { CountrySelector } from '@/components/CountrySelector';

const CareerRoadmaps = () => {
  const { toast } = useToast();
  const { country } = useUserLocale();
  const [search, setSearch] = useState('');
  const [demandFilter, setDemandFilter] = useState<'All' | 'Very High' | 'High'>('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'experienced'>('fresher');

  const [savedState, setSavedState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    roadmaps.forEach((r) => { state[r.id] = isCareerSaved(r.id); });
    return state;
  });

  const filtered = useMemo(() => {
    return roadmaps.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesDemand = demandFilter === 'All' || r.demand === demandFilter;
      const matchesSaved = !showSavedOnly || savedState[r.id];
      return matchesSearch && matchesDemand && matchesSaved;
    });
  }, [search, demandFilter, showSavedOnly, savedState]);

  const handleToggleSave = (e: React.MouseEvent, careerId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isSaved = toggleSaveCareer(careerId);
    setSavedState((prev) => ({ ...prev, [careerId]: isSaved }));
    toast({
      title: isSaved ? 'Career saved' : 'Career removed',
      description: isSaved
        ? `${title} added to saved careers.`
        : `${title} removed from saved careers.`,
    });
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'Very High': return 'bg-success/10 text-success border-success/20';
      case 'High':      return 'bg-primary/10 text-primary border-primary/20';
      default:          return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Career Roadmaps</h1>
            <p className="text-muted-foreground">
              Choose a career path and follow the step-by-step guide.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CountrySelector />
          </div>
        </div>

        {/* ── Search + Filters ─────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search career or skill (e.g. Python, Data Science)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Filter:</span>
            {(['All', 'Very High', 'High'] as const).map((d) => (
              <Button
                key={d}
                variant={demandFilter === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDemandFilter(d)}
                className="rounded-full"
              >
                {d === 'All' ? 'All Roles' : `${d} Demand`}
              </Button>
            ))}
            <Button
              variant={showSavedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className="rounded-full ml-auto"
            >
              <Bookmark className={`w-3.5 h-3.5 mr-1 ${showSavedOnly ? 'fill-current' : ''}`} />
              Saved Only
            </Button>
          </div>

          {/* Experience toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground mr-2">Show salary for:</span>
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
        </div>

        {/* ── Results count ────────────────────────────────────────── */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filtered.length} of {roadmaps.length} roadmaps
        </p>

        {/* ── Grid ─────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <p className="text-muted-foreground mb-4">No roadmaps match your filters.</p>
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setDemandFilter('All'); setShowSavedOnly(false); }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filtered.map((roadmap, index) => {
              const IconComponent = roadmap.icon;
              const localSalary = localizeSalaryString(roadmap.salary, country, experienceLevel);

              return (
                <Link
                  key={roadmap.id}
                  to={`/roadmaps/${roadmap.id}`}
                  className="
                    group flex flex-col h-full
                    bg-card rounded-2xl border border-border p-6
                    hover:border-primary/50 hover:shadow-lg hover:-translate-y-1
                    transition-all animate-fade-in-up
                  "
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* ── Row 1: Icon  |  Badge + Bookmark ── */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-2xl ${roadmap.color} flex items-center justify-center text-white shrink-0`}
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>

                    {/* Badge + Bookmark always on the same line */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDemandColor(roadmap.demand)}>
                        {roadmap.demand} Demand
                      </Badge>
                      <button
                        onClick={(e) => handleToggleSave(e, roadmap.id, roadmap.title)}
                        className={`p-2 rounded-lg transition-colors ${
                          savedState[roadmap.id]
                            ? 'text-primary bg-primary/10'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                        }`}
                        title={savedState[roadmap.id] ? 'Remove from saved' : 'Save career'}
                      >
                        <Bookmark className={`w-5 h-5 ${savedState[roadmap.id] ? 'fill-primary' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* ── Row 2: Title (fixed min-height so all cards align) ── */}
                  <h3 className="text-xl font-bold text-foreground mb-2 min-h-[3.5rem] group-hover:text-primary transition-colors">
                    {roadmap.title}
                  </h3>

                  {/* ── Row 3: Description (fixed height via line-clamp) ── */}
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {roadmap.description}
                  </p>

                  {/* ── Row 4: Skills ── */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {roadmap.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {roadmap.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{roadmap.skills.length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* ── Row 5: Salary / Growth / Arrow — pinned to bottom ── */}
                  <div className="flex items-center gap-4 pt-4 mt-auto border-t border-border">
                    <div className="flex items-center gap-1 text-sm">
                      <Wallet className="w-4 h-4 text-success shrink-0" />
                      <span className="text-muted-foreground font-medium">{localSalary}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{roadmap.growth}</span>
                    </div>
                    <div className="ml-auto">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CareerRoadmaps;