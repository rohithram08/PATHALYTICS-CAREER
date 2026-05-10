// src/pages/SuccessStories.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Filter,
  MapPin,
  Quote,
  Search,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Story {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  transition: string;
  category: string;
  quote: string;
  outcome: string;
  timeframe: string;
  initials: string;
  avatarColor: string;
}

const stories: Story[] = [
  {
    id: "ananya-frontend",
    name: "Ananya Krishnan",
    role: "Frontend Developer",
    company: "Zoho",
    location: "Chennai, India",
    transition: "BCA Graduate → Frontend Developer",
    category: "Development",
    quote:
      "I had just graduated with a BCA degree and no job offers. Using Pathalytics I found my path, followed the frontend roadmap, and landed my first role at Zoho within 5 months.",
    outcome: "Secured first dev role in 5 months",
    timeframe: "5 months",
    initials: "AK",
    avatarColor: "bg-primary/20 text-primary",
  },
  {
    id: "rohan-data",
    name: "Rohan Mehta",
    role: "Data Analyst",
    company: "Flipkart",
    location: "Bengaluru, India",
    transition: "Mechanical Engineer → Data Analyst",
    category: "Career Change",
    quote:
      "I was stuck in a mechanical role I had no passion for. Pathalytics helped me figure out data analytics was the right fit. The roadmap made the transition feel structured and achievable.",
    outcome: "Career switch in under 8 months",
    timeframe: "8 months",
    initials: "RM",
    avatarColor: "bg-emerald-500/20 text-emerald-600",
  },
  {
    id: "priya-ux",
    name: "Priya Nair",
    role: "UX Designer",
    company: "Swiggy",
    location: "Hyderabad, India",
    transition: "Graphic Designer → UX Designer",
    category: "Design",
    quote:
      "I knew I was good at design but had never thought about UX. The career quiz recommended it, the roadmap gave me the steps, and now I design for millions of users every day.",
    outcome: "Promoted to UX Designer from Graphic Design",
    timeframe: "6 months",
    initials: "PN",
    avatarColor: "bg-purple-500/20 text-purple-600",
  },
  {
    id: "arjun-cloud",
    name: "Arjun Iyer",
    role: "Cloud Engineer",
    company: "Infosys",
    location: "Pune, India",
    transition: "IT Support → Cloud Engineer",
    category: "Cloud",
    quote:
      "I was doing IT support for 3 years and felt stuck. The Pathalytics roadmap for cloud engineering was the clearest learning plan I had ever seen. I got AWS certified and moved roles.",
    outcome: "AWS certified and new role in 7 months",
    timeframe: "7 months",
    initials: "AI",
    avatarColor: "bg-amber-500/20 text-amber-600",
  },
  {
    id: "divya-cybersec",
    name: "Divya Sharma",
    role: "Cybersecurity Analyst",
    company: "TCS",
    location: "Delhi, India",
    transition: "Fresh Graduate → Cybersecurity Analyst",
    category: "Cybersecurity",
    quote:
      "I always found security interesting but had no idea how to get started. Pathalytics matched me to it, and the structured roadmap helped me focus on exactly the right skills for my first job.",
    outcome: "First job in cybersecurity at TCS",
    timeframe: "6 months",
    initials: "DS",
    avatarColor: "bg-blue-500/20 text-blue-600",
  },
  {
    id: "kiran-backend",
    name: "Kiran Reddy",
    role: "Backend Developer",
    company: "Razorpay",
    location: "Bengaluru, India",
    transition: "Self-taught Coder → Backend Developer",
    category: "Development",
    quote:
      "I had been coding as a hobby for years but never worked professionally. The AI mock interviews gave me the confidence I was missing. I aced the technical round at Razorpay.",
    outcome: "Hobby coder to professional developer",
    timeframe: "4 months",
    initials: "KR",
    avatarColor: "bg-rose-500/20 text-rose-600",
  },
];

const categories = [
  "All",
  "Development",
  "Career Change",
  "Design",
  "Cloud",
  "Cybersecurity",
];

const SuccessStories = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return stories.filter((item) => {
      const matchesCategory =
        category === "All" || item.category === category;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query) ||
        item.company.toLowerCase().includes(query) ||
        item.transition.toLowerCase().includes(query) ||
        item.quote.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <Badge variant="secondary">Success Stories</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Real people, real results
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Stories from students and professionals who used Pathalytics to
            discover their career path, learn the right skills, and land roles
            they are proud of.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { value: "500+", label: "Careers discovered", icon: Star },
            { value: "6 mo", label: "Avg. time to first role", icon: Trophy },
            { value: "20+", label: "Career paths covered", icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-5 text-center"
            >
              <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or company"
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

        {/* Stories */}
        {filtered.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="p-10 text-center">
              <Trophy className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No stories found
              </h2>
              <p className="text-muted-foreground">
                Try a different keyword or category filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((story) => (
              <Card
                key={story.id}
                className="border-border hover:border-primary/40 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${story.avatarColor}`}
                      >
                        {story.initials}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{story.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {story.role} at {story.company}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {story.category}
                    </Badge>
                  </div>

                  <div className="relative mb-4">
                    <Quote className="w-5 h-5 text-primary/30 absolute -top-1 -left-1" />
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5 italic">
                      {story.quote}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {story.location}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                      <Trophy className="w-3.5 h-3.5 text-primary" />
                      {story.timeframe}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-foreground mb-0.5">
                      Transition
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {story.transition}
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-primary mb-0.5">
                      Outcome
                    </p>
                    <p className="text-sm text-foreground">{story.outcome}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <Star className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Start your own success story
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Answer a few quick questions and get a career recommendation tailored
            to your skills, interests, and goals. Free, fast, and AI-powered.
          </p>
          <Button asChild>
            <Link to="/signup">
              Get My Career Match
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SuccessStories;