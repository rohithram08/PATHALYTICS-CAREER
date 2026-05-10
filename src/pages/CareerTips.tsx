// src/pages/CareerTips.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  Search,
  Filter,
  Clock,
  ArrowRight,
  Target,
  MessageCircle,
  Mic,
  BookOpen,
  Star,
  Briefcase,
  Code2,
  X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TipArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  level: "Beginner" | "Intermediate" | "All Levels";
  icon: React.ElementType;
  featured?: boolean;
}

const tips: TipArticle[] = [
  {
    id: "technical-interview-prep",
    title: "A Realistic 4-Week Technical Interview Prep Plan",
    excerpt:
      "Stop grinding 200 problems randomly. This structured 4-week plan covers data structures, algorithms, system design basics, and behavioural prep — in that order.",
    category: "Interviews",
    readTime: "8 min read",
    date: "April 2025",
    level: "Intermediate",
    icon: Code2,
    featured: true,
  },
  {
    id: "build-portfolio-no-experience",
    title: "How to Build a Portfolio With Zero Experience",
    excerpt:
      "You do not need a job to build a portfolio. Learn how to create projects, document your work, and present it in a way that gets the attention of hiring managers.",
    category: "Portfolio",
    readTime: "5 min read",
    date: "May 2025",
    level: "Beginner",
    icon: Briefcase,
  },
  {
    id: "linkedin-profile-tips",
    title: "10 LinkedIn Profile Tweaks That Get You Noticed",
    excerpt:
      "Most people set up a LinkedIn profile and forget about it. These 10 small changes dramatically improve how recruiters find and evaluate your profile.",
    category: "Job Search",
    readTime: "4 min read",
    date: "April 2025",
    level: "All Levels",
    icon: Star,
  },
  {
    id: "first-job-salary-negotiation",
    title: "How to Negotiate Your First Tech Salary",
    excerpt:
      "Salary negotiation feels scary for first-timers — but it is expected. Here is a word-for-word framework for negotiating your first offer without risking it.",
    category: "Salary",
    readTime: "6 min read",
    date: "March 2025",
    level: "Beginner",
    icon: MessageCircle,
  },
  {
    id: "soft-skills-for-devs",
    title: "The Soft Skills That Separate Good Developers from Great Ones",
    excerpt:
      "Technical skill gets you hired. Soft skills get you promoted. We cover the five non-technical skills that make a measurable difference in a developer's career.",
    category: "Career Growth",
    readTime: "5 min read",
    date: "March 2025",
    level: "All Levels",
    icon: Target,
  },
  {
    id: "crack-behavioural-interview",
    title: "How to Crack Behavioural Interview Questions Using STAR",
    excerpt:
      "Most candidates fail behavioural rounds not because of bad answers but because of poor structure. Learn the STAR method and practice with real examples.",
    category: "Interviews",
    readTime: "6 min read",
    date: "February 2025",
    level: "Beginner",
    icon: Mic,
  },
  {
    id: "switch-career-into-tech",
    title: "How to Switch Into Tech From a Non-Tech Background",
    excerpt:
      "Marketing, teaching, finance — many professionals successfully transition into tech. Here is a proven path, common mistakes, and the roles most open to career switchers.",
    category: "Career Change",
    readTime: "7 min read",
    date: "February 2025",
    level: "All Levels",
    icon: ArrowRight,
  },
  {
    id: "learn-to-code-faster",
    title: "How to Learn to Code Faster Without Burning Out",
    excerpt:
      "Most beginners quit not from lack of ability but from poor learning strategies. These evidence-backed techniques will help you retain more and progress faster.",
    category: "Learning",
    readTime: "5 min read",
    date: "January 2025",
    level: "Beginner",
    icon: BookOpen,
  },
];

const categories = [
  "All",
  "Portfolio",
  "Job Search",
  "Interviews",
  "Salary",
  "Career Growth",
  "Career Change",
  "Learning",
];

const levels = ["All", "Beginner", "Intermediate", "All Levels"];

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "All Levels": "bg-primary/10 text-primary border-primary/20",
};

// ─── Featured Hero Card ──────────────────────────────────────────────────────
const FeaturedCard = ({ tip }: { tip: TipArticle }) => {
  const Icon = tip.icon;
  return (
    <Link
      to={`/career-tips/${tip.id}`}
      className="group block mb-8 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-primary text-primary-foreground text-xs">
              ✦ Featured
            </Badge>
            <Badge variant="outline" className="text-xs">
              {tip.category}
            </Badge>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${levelColors[tip.level]}`}
            >
              {tip.level}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
            {tip.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
            {tip.excerpt}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {tip.readTime}
            </span>
            <span>{tip.date}</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
          Read article
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};

// ─── Tip Card ────────────────────────────────────────────────────────────────
const TipCard = ({ tip }: { tip: TipArticle }) => {
  const Icon = tip.icon;
  return (
    <Link
      to={`/career-tips/${tip.id}`}
      className="group block h-full rounded-xl border border-border bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${levelColors[tip.level]}`}
          >
            {tip.level}
          </span>
        </div>

        <Badge variant="outline" className="w-fit mb-3 text-xs">
          {tip.category}
        </Badge>

        <h2 className="text-base font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
          {tip.title}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
          {tip.excerpt}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {tip.readTime}
          </div>
          <span className="flex items-center gap-1 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Read <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const CareerTips = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");

  const isFiltered = search.trim() !== "" || category !== "All" || level !== "All";

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setLevel("All");
  };

  const featuredTip = tips.find((t) => t.featured);
  const regularTips = tips.filter((t) => !t.featured);

  const filtered = useMemo(() => {
    return regularTips.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesLevel = level === "All" || item.level === level;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchesCategory && matchesLevel && matchesSearch;
    });
  }, [search, category, level]);

  // Also check if featured should show when filtering
  const featuredVisible =
    featuredTip &&
    !isFiltered || // always show when no filter active
    (featuredTip &&
      (category === "All" || featuredTip.category === category) &&
      (level === "All" || featuredTip.level === level) &&
      (!search.trim() ||
        featuredTip.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        featuredTip.excerpt.toLowerCase().includes(search.trim().toLowerCase())));

  const totalVisible =
    (featuredVisible ? 1 : 0) + filtered.length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-primary" />
            <Badge variant="secondary">Career Tips</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Practical tips for every stage
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Actionable guidance on interviews, job searching, portfolio building,
            salary negotiation, and long-term career growth — written for students
            and early-career professionals.
          </p>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic or keyword…"
              className="pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Topic:
            </span>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${
                  category === item
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground shrink-0 mr-1 w-[62px]">
              Level:
            </span>
            {levels.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${
                  level === item
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Result count + clear */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isFiltered
              ? `${totalVisible} result${totalVisible !== 1 ? "s" : ""} found`
              : `${tips.length} articles`}
          </p>
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Featured */}
        {featuredVisible && featuredTip && <FeaturedCard tip={featuredTip} />}

        {/* Articles grid */}
        {filtered.length === 0 && !featuredVisible ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-10 text-center">
              <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No tips found
              </h2>
              <p className="text-muted-foreground mb-4">
                Try a different keyword, topic, or level filter.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Put your interview skills to the test
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Practice with Alex, your AI interviewer, and get instant feedback on
            your answers so you walk into real interviews with confidence.
          </p>
          <Button asChild size="lg">
            <Link to="/signup">
              Try AI Interview Practice
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CareerTips;