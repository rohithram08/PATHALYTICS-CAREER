// src/pages/Jobs.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TrendingUp, Search, X, Briefcase, ClipboardList, ExternalLink,
  Calendar, MapPin, Inbox, StickyNote, Trash2, ArrowUpDown,
  ChevronDown, CheckCircle2, Filter,
} from 'lucide-react';
import Layout       from '@/components/Layout';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Badge }    from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast }  from '@/hooks/use-toast';
import JobListings   from '@/components/JobListings';
import {
  getApplications, updateApplicationNotes, updateApplicationStatus,
  removeApplication, getStatusCounts, STATUS_CONFIG,
  ApplicationStatus, JobApplication,
} from '@/lib/applications';

const POPULAR_CAREERS = [
  'Software Engineer', 'Data Scientist', 'Product Manager',
  'UI/UX Designer', 'DevOps Engineer', 'Marketing Manager',
] as const;

type SortKey = 'newest' | 'oldest' | 'company';
type Tab     = 'find' | 'applications';
const PAGE_SIZE = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function relativeDay(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const career     = searchParams.get('career') ?? '';
  const tabFromUrl = (searchParams.get('tab') as Tab) ?? 'find';
  const { toast }  = useToast();

  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl);
  const [query, setQuery]         = useState(career);
  const debouncedQuery            = useDebounce(query.trim(), 400);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery)       params.career = debouncedQuery;
    if (activeTab !== 'find') params.tab    = activeTab;
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchQuery = useMemo(
    () => (debouncedQuery ? `${debouncedQuery} jobs` : undefined),
    [debouncedQuery],
  );

  const handleClear     = () => setQuery('');
  const handleChipClick = (v: string) =>
    setQuery((prev) => prev.toLowerCase() === v.toLowerCase() ? '' : v);

  const [applications, setApplications] = useState<JobApplication[]>(getApplications);
  const [appsSearch,   setAppsSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [sortKey,      setSortKey]      = useState<SortKey>('newest');
  const [page,         setPage]         = useState(1);
  const [notesEditing, setNotesEditing] = useState<JobApplication | null>(null);
  const [notesDraft,   setNotesDraft]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);

  const debouncedAppsSearch = useDebounce(appsSearch, 300);
  const refreshApps = useCallback(() => setApplications(getApplications()), []);

  useEffect(() => { if (activeTab === 'applications') refreshApps(); }, [activeTab, refreshApps]);
  useEffect(() => { setPage(1); }, [debouncedAppsSearch, sortKey, statusFilter]);

  const nowRef = useRef(Date.now());
  useEffect(() => { nowRef.current = Date.now(); }, [applications]);

  const counts = useMemo(() => {
    const now  = nowRef.current;
    const WEEK = 7 * 86_400_000;
    let thisWeek = 0;
    applications.forEach((a) => {
      if (now - new Date(a.appliedAt).getTime() < WEEK) thisWeek++;
    });
    return { total: applications.length, thisWeek, byStatus: getStatusCounts() };
  }, [applications]);

  const filteredApps = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    const q = debouncedAppsSearch.toLowerCase();
    if (q) list = list.filter((a) =>
      a.jobTitle.toLowerCase().includes(q) ||
      a.company.toLowerCase().includes(q)  ||
      a.location.toLowerCase().includes(q));
    const sorted = [...list];
    if (sortKey === 'newest')  sorted.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    if (sortKey === 'oldest')  sorted.sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime());
    if (sortKey === 'company') sorted.sort((a, b) => a.company.localeCompare(b.company));
    return sorted;
  }, [applications, debouncedAppsSearch, sortKey, statusFilter]);

  const pagedApps = filteredApps.slice(0, page * PAGE_SIZE);
  const hasMore   = pagedApps.length < filteredApps.length;

  const openNotes = useCallback((app: JobApplication) => {
    setNotesEditing(app); setNotesDraft(app.notes ?? '');
  }, []);

  const saveNotes = () => {
    if (!notesEditing) return;
    updateApplicationNotes(notesEditing.id, notesDraft);
    refreshApps(); setNotesEditing(null);
    toast({ title: 'Notes saved' });
  };

  const handleStatusChange = (id: string, status: ApplicationStatus) => {
    updateApplicationStatus(id, status); refreshApps();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeApplication(deleteTarget.id);
    refreshApps(); setDeleteTarget(null);
    toast({ title: 'Application removed', variant: 'destructive' });
  };

  const sortLabel: Record<SortKey, string> = {
    newest: 'Newest', oldest: 'Oldest', company: 'Company A–Z',
  };

  return (
    <Layout showBreadcrumbs={false}>

      {/* ── Sticky sub-header (top-0 because Layout already handles pt-16) ── */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-6
                      bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3
                        flex flex-col sm:flex-row sm:items-center gap-3">

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Jobs</span>
          </div>

          <div className="inline-flex items-center bg-muted rounded-full p-1 shrink-0">
            <TabBtn active={activeTab === 'find'} onClick={() => setActiveTab('find')}>
              <Briefcase className="w-3.5 h-3.5" /> Find Jobs
            </TabBtn>
            <TabBtn active={activeTab === 'applications'} onClick={() => setActiveTab('applications')}>
              <ClipboardList className="w-3.5 h-3.5" /> My Applications
              {applications.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'applications' ? 'bg-white/20' : 'bg-primary/15 text-primary'}`}>
                  {applications.length}
                </span>
              )}
            </TabBtn>
          </div>

          {activeTab === 'find' && (
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Role, skill, or company…" aria-label="Search jobs"
                className="pl-9 pr-9 h-9 rounded-full text-sm" />
              {query && (
                <button onClick={handleClear} aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ FIND JOBS ══════════════════════════════════════════════════════════ */}
      {activeTab === 'find' && (
        <>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CAREERS.map((c) => {
                const isActive = debouncedQuery.toLowerCase() === c.toLowerCase();
                return (
                  <button key={c} onClick={() => handleChipClick(c)}
                    className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-foreground'
                    }`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {debouncedQuery && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Results for</span>
              <Badge variant="secondary" className="gap-1 pr-1 text-sm font-normal">
                {debouncedQuery}
                <button onClick={handleClear} aria-label="Clear"
                  className="ml-0.5 rounded-full p-0.5 hover:bg-background/50 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </div>
          )}

          <JobListings resultsPerPage={12} hideMoreLink hideHeader searchQuery={searchQuery} />

          <div className="mt-14 text-center border-t border-border pt-8">
            <p className="text-muted-foreground text-sm mb-3">Didn't find what you're looking for?</p>
            <Button asChild variant="outline"><Link to="/roadmaps">Explore Career Paths</Link></Button>
          </div>
        </>
      )}

      {/* ══ MY APPLICATIONS ════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <>
          {/* Stats */}
          {applications.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Applied"  value={counts.total}                        accent="text-primary"                            bg="bg-primary/5 border-primary/20" />
              <StatCard label="This Week"      value={counts.thisWeek}                     accent="text-blue-600 dark:text-blue-400"        bg="bg-blue-500/5 border-blue-500/20" />
              <StatCard label="Interviewing"   value={counts.byStatus['interview'] ?? 0}  accent="text-amber-600 dark:text-amber-400"      bg="bg-amber-500/5 border-amber-500/20" />
              <StatCard label="Offers"         value={counts.byStatus['offer'] ?? 0}      accent="text-emerald-600 dark:text-emerald-400"  bg="bg-emerald-500/5 border-emerald-500/20" />
            </div>
          )}

          {/* Status filter pills */}
          {applications.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                }`}>
                All ({counts.total})
              </button>
              {(Object.entries(STATUS_CONFIG) as [ApplicationStatus, typeof STATUS_CONFIG[ApplicationStatus]][])
                .filter(([key]) => (counts.byStatus[key] ?? 0) > 0)
                .map(([key, s]) => (
                  <button key={key}
                    onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                      statusFilter === key
                        ? `${s.bgColor} ${s.color} ring-2 ring-offset-1`
                        : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                    }`}>
                    {s.emoji} {s.label} <span className="font-bold">{counts.byStatus[key] ?? 0}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Search + sort */}
          {applications.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by title, company, or location…" value={appsSearch}
                  onChange={(e) => setAppsSearch(e.target.value)} className="pl-10 pr-9" />
                {appsSearch && (
                  <button onClick={() => setAppsSearch('')} aria-label="Clear"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 shrink-0 w-full sm:w-auto">
                    <ArrowUpDown className="w-4 h-4" /> Sort: {sortLabel[sortKey]}
                    <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortKey('newest')}>Newest first</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey('oldest')}>Oldest first</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortKey('company')}>Company A–Z</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Filter count summary */}
          {(debouncedAppsSearch || statusFilter !== 'all') && filteredApps.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Showing {filteredApps.length} of {applications.length} applications
              {statusFilter !== 'all' && (
                <span>· filtered by <strong className="text-foreground">{STATUS_CONFIG[statusFilter].label}</strong></span>
              )}
            </p>
          )}

          {/* Empty: no applications */}
          {applications.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                Apply to jobs from the Find Jobs tab — they'll appear here so you can track your progress.
              </p>
              <Button onClick={() => setActiveTab('find')}>
                <Briefcase className="w-4 h-4 mr-2" /> Find Jobs
              </Button>
            </div>

          ) : filteredApps.length === 0 ? (
            <div className="text-center py-14 bg-card border border-border rounded-2xl">
              <p className="text-muted-foreground mb-4 text-sm">No applications match your current filters.</p>
              <div className="flex items-center justify-center gap-2">
                {appsSearch && <Button variant="outline" onClick={() => setAppsSearch('')}>Clear search</Button>}
                {statusFilter !== 'all' && <Button variant="outline" onClick={() => setStatusFilter('all')}>Clear filter</Button>}
              </div>
            </div>

          ) : (
            <>
              <div className="space-y-3">
                {pagedApps.map((app) => {
                  const status  = app.status ?? 'applied';
                  const cfg     = STATUS_CONFIG[status];
                  const initial = app.company.charAt(0).toUpperCase();
                  return (
                    <div key={app.id}
                      className="group bg-card border border-border rounded-2xl p-4 md:p-5
                                 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20
                                          flex items-center justify-center shrink-0 border border-border">
                            <span className="text-base font-bold text-foreground">{initial}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <h3 className="font-semibold text-foreground text-base leading-snug">{app.jobTitle}</h3>
                              <span className="text-muted-foreground text-sm">{app.company}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                              {app.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>}
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{relativeDay(new Date(app.appliedAt))}</span>
                            </div>
                            {app.notes && (
                              <button onClick={() => openNotes(app)}
                                className="mt-2 flex items-start gap-2 text-left text-xs
                                           bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/60
                                           dark:border-amber-500/20 rounded-lg px-3 py-2 w-full
                                           hover:bg-amber-100/60 dark:hover:bg-amber-500/10 transition-colors">
                                <StickyNote className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground line-clamp-1">{app.notes}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer hover:opacity-80 ${cfg.bgColor} ${cfg.color}`}>
                                <span>{cfg.emoji}</span>{cfg.label}
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(Object.entries(STATUS_CONFIG) as [ApplicationStatus, typeof STATUS_CONFIG[ApplicationStatus]][])
                                .map(([value, s]) => (
                                  <DropdownMenuItem key={value}
                                    onClick={() => handleStatusChange(app.id, value)}
                                    className={value === status ? 'font-semibold' : ''}>
                                    {s.emoji} {s.label}
                                    {value === status && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button variant="outline" size="sm" onClick={() => openNotes(app)} className="h-8 gap-1.5 text-xs">
                            <StickyNote className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{app.notes ? 'Edit note' : 'Add note'}</span>
                          </Button>

                          <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 text-xs">
                            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View Posting</span>
                            </a>
                          </Button>

                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(app)}
                            className="h-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            aria-label="Remove application">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="text-center mt-6">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more ({filteredApps.length - pagedApps.length} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Notes Dialog */}
      <Dialog open={!!notesEditing} onOpenChange={(open) => !open && setNotesEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <StickyNote className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base leading-tight truncate">{notesEditing?.jobTitle}</DialogTitle>
                <p className="text-xs text-muted-foreground truncate">{notesEditing?.company} · {notesEditing?.location}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Notes</label>
              <span className={`text-xs ${notesDraft.length > 800 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {notesDraft.length}/1000
              </span>
            </div>
            <Textarea rows={7} maxLength={1000} autoFocus
              placeholder="e.g. Phone screen Friday · Ask about remote · Follow up Nov 20"
              value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
              className="resize-none text-sm" />
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setNotesEditing(null)}>Cancel</Button>
            <Button onClick={saveNotes} className="gap-1.5">
              <StickyNote className="w-4 h-4" /> Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove application?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{deleteTarget?.jobTitle}</strong> at{' '}
            <strong className="text-foreground">{deleteTarget?.company}</strong> will be permanently removed.
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="gap-1.5">
              <Trash2 className="w-4 h-4" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
};

const TabBtn = ({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`}>
    {children}
  </button>
);

const StatCard = ({ label, value, accent, bg }: {
  label: string; value: number; accent: string; bg: string;
}) => (
  <div className={`rounded-2xl border p-4 ${bg}`}>
    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
    <p className={`text-2xl md:text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
  </div>
);

export default Jobs;