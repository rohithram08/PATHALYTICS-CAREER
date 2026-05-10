// src/pages/IndustryInsights.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Clock,
  Filter,
  Search,
  TrendingUp,
  ArrowRight,
  Lightbulb,
  Globe,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface InsightArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  tag: string;
  icon: React.ElementType;
}

const articles: InsightArticle[] = [
  {
    id: "ai-jobs-2025",
    title: "How AI is Reshaping the Job Market in 2025",
    excerpt:
      "Artificial intelligence is not just automating tasks — it is creating entirely new job categories in prompt engineering, AI auditing, and model alignment. Here is what the data shows.",
    category: "AI & Technology",
    readTime: "6 min read",
    date: "May 2025",
    tag: "Trending",
    icon: TrendingUp,
  },
  {
    id: "remote-work-reality",
    title: "Remote Work in Tech: The Real State in 2025",
    excerpt:
      "Three years after companies began reversing remote-first policies, the data paints a nuanced picture. Hybrid roles dominate — but not uniformly across all roles and regions.",
    category: "Work Culture",
    readTime: "5 min read",
    date: "April 2025",
    tag: "Work Trends",
    icon: Globe,
  },
  {
    id: "data-science-salaries",
    title: "Data Science Salaries: What to Expect in 2025",
    excerpt:
      "Entry-level, mid-level, and senior data scientist compensation across India, the US, and Europe — including equity, bonuses, and total compensation packages.",
    category: "Salaries",
    readTime: "7 min read",
    date: "April 2025",
    tag: "Salaries",
    icon: BarChart3,
  },
  {
    id: "cybersecurity-shortage",
    title: "The Global Cybersecurity Talent Shortage",
    excerpt:
      "3.5 million cybersecurity roles remain unfilled globally. Why the gap is growing, which skills are most needed, and what that means for anyone considering this career path.",
    category: "Cybersecurity",
    readTime: "5 min read",
    date: "March 2025",
    tag: "High Demand",
    icon: Lightbulb,
  },
  {
    id: "frontend-vs-backend",
    title: "Frontend vs Backend in 2025: Which Should You Choose?",
    excerpt:
      "Both roles are evolving rapidly. Full-stack expectations are rising, but specialisation still pays off. A data-backed breakdown of where the market is heading.",
    category: "Development",
    readTime: "6 min read",
    date: "March 2025",
    tag: "Career",
    icon: BookOpen,
  },
  {
    id: "ux-design-growth",
    title: "Why UX Design is One of the Fastest Growing Roles",
    excerpt:
      "As digital products multiply, the demand for UX designers continues to outpace supply. We break down where the opportunities are and what skills are in highest demand.",
    category: "Design",
    readTime: "4 min read",
    date: "February 2025",
    tag: "Growing Field",
    icon: TrendingUp,
  },
  {
    id: "cloud-career-paths",
    title: "Cloud Engineering Career Paths: AWS vs Azure vs GCP",
    excerpt:
      "Which cloud platform should you certify in first? We compare job market demand, salary differences, and community resources across the three major providers.",
    category: "Cloud",
    readTime: "8 min read",
    date: "February 2025",
    tag: "Certifications",
    icon: BarChart3,
  },
  {
    id: "india-tech-growth",
    title: "India's Tech Industry: Fastest Growing Career Sectors",
    excerpt:
      "From Bengaluru to Hyderabad to Pune, India's tech hiring is accelerating. This report covers the top cities, roles, and salary brackets dominating hiring in 2025.",
    category: "India Market",
    readTime: "6 min read",
    date: "January 2025",
    tag: "India",
    icon: Globe,
  },
];

const categories = [
  "All",
  "AI & Technology",
  "Salaries",
  "Development",
  "Design",
  "Cloud",
  "Cybersecurity",
  "Work Culture",
  "India Market",
];

const IndustryInsights = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return articles.filter((item) => {
      const matchesCategory =
        category === "All" || item.category === category;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <Badge variant="secondary">Industry Insights</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            What's happening in the job market
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Data-driven articles on salary trends, hiring patterns, emerging
            roles, and the skills companies are actively seeking right now.
          </p>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Articles are editorially curated and updated regularly. Data
            reflects publicly available industry reports and job market analyses.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search insights by topic or keyword"
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Filter className="w-4 h-4" />
              Filter:
            </div>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`px-3 py-2 rounded-full text-sm border whitespace-nowrap transition-colors ${
                  category === item
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/40"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Articles */}
        {filtered.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-10 text-center">
              <BarChart3 className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No articles found
              </h2>
              <p className="text-muted-foreground">
                Try a different keyword or change the selected category.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((article) => {
              const Icon = article.icon;
              return (
                <Card
                  key={article.id}
                  className="border-border h-full hover:border-primary/40 hover:-translate-y-1 transition-all duration-200"
                >
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary">{article.tag}</Badge>
                    </div>

                    <Badge
                      variant="outline"
                      className="w-fit mb-3 text-xs"
                    >
                      {article.category}
                    </Badge>

                    <h2 className="text-lg font-bold text-foreground mb-2 leading-snug">
                      {article.title}
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readTime}
                      </div>
                      <span>{article.date}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <TrendingUp className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Want personalised career guidance?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Use our AI tool to get career recommendations tailored to your
            skills, interests, and work style.
          </p>
          <Button asChild>
            <Link to="/career-recommendation">
              Find My Career Match
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default IndustryInsights;