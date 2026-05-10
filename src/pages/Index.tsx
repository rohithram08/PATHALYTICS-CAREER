// src/pages/Index.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, type Variants } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Map,
  Bot,
  Briefcase,
  TrendingUp,
  Shield,
  CheckCircle2,
  Star,
  Target,
  Zap,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useAuth } from "@/hooks/useAuth";

// -------- Animation helpers --------
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// -------- Section wrapper with intersection observer --------
const Section = ({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// ======================== PAGE ========================
const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // 🚀 Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Don't flash landing page while auth is being checked or while redirecting
  if (isLoading || isAuthenticated) {
    return null;
  }

  const features = [
    {
      icon: Sparkles,
      title: "AI Career Matching",
      description:
        "Take our intelligent quiz and get personalized career recommendations based on your skills, interests, and personality.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Map,
      title: "Interactive Roadmaps",
      description:
        "Follow step-by-step visual roadmaps tailored to your chosen career, with milestones and progress tracking.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Bot,
      title: "AI Career Advisor",
      description:
        "Chat with our AI-powered advisor anytime for career guidance, resume tips, and interview prep.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Briefcase,
      title: "Smart Job Board",
      description:
        "Discover curated job listings matched to your career goals with intelligent filtering and alerts.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: TrendingUp,
      title: "Industry Insights",
      description:
        "Stay informed with real-time industry trends, salary data, and market analysis for your target fields.",
      color: "from-indigo-500 to-violet-500",
    },
    {
      icon: Shield,
      title: "Progress Tracking",
      description:
        "Track your career development journey with activity logs, skill assessments, and growth analytics.",
      color: "from-teal-500 to-cyan-500",
    },
  ];

  const stats = [
    { value: 10000, suffix: "+", label: "Career Paths Analyzed" },
    { value: 95, suffix: "%", label: "User Satisfaction" },
    { value: 500, suffix: "+", label: "Industry Roadmaps" },
    { value: 24, suffix: "/7", label: "AI Advisor Available" },
  ];

  const steps = [
    {
      step: "01",
      title: "Take the Career Quiz",
      description:
        "Answer questions about your skills, interests, and goals in our smart assessment.",
      icon: Target,
    },
    {
      step: "02",
      title: "Get AI Recommendations",
      description:
        "Receive personalized career matches with detailed insights and match percentages.",
      icon: Sparkles,
    },
    {
      step: "03",
      title: "Follow Your Roadmap",
      description:
        "Access step-by-step roadmaps with resources, milestones, and progress tracking.",
      icon: Map,
    },
    {
      step: "04",
      title: "Land Your Dream Job",
      description:
        "Apply to curated jobs and accelerate your career with AI-powered guidance.",
      icon: Zap,
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Software Engineer at Google",
      content:
        "Pathalytics helped me transition from finance to tech in just 8 months. The roadmap was incredibly detailed and the AI advisor was like having a personal mentor!",
      avatar: "SJ",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "UX Designer at Airbnb",
      content:
        "I was lost about my career direction. The career quiz revealed my hidden strengths and now I'm in a field I truly love. Best decision ever.",
      avatar: "MC",
      rating: 5,
    },
    {
      name: "Priya Patel",
      role: "Data Scientist at Microsoft",
      content:
        "The structured roadmaps and constant AI support made my career switch seamless. The job board is curated perfectly to match my profile.",
      avatar: "PP",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div className="absolute inset-0 grid-pattern opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={staggerItem}>
              <Badge
                variant="outline"
                className="mb-6 px-4 py-1.5 text-sm border-primary/30 bg-primary/5"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
                AI-Powered Career Guidance Platform
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              Discover Your{" "}
              <span className="gradient-text animate-gradient bg-gradient-to-r from-primary via-purple-500 to-pink-500">
                Perfect Career
              </span>{" "}
              Path
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Get personalized career recommendations, interactive roadmaps, and
              AI-powered guidance to accelerate your professional journey.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Button
                size="lg"
                className="text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                onClick={() => navigate("/signup")}
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-12"
                onClick={() => navigate("/career-tips")}
              >
                Explore Resources
              </Button>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Cancel anytime
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 md:mt-20 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border bg-card shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
              <div className="relative p-2">
                <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted aspect-[16/9] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 mx-auto mb-4 flex items-center justify-center shadow-xl animate-float">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Dashboard Preview
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ STATS SECTION ============ */}
      <Section className="py-16 md:py-20 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={i} variants={staggerItem} className="text-center">
                <div className="text-3xl md:text-5xl font-bold gradient-text mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ FEATURES SECTION ============ */}
      <Section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerItem}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you need to <span className="gradient-text">succeed</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful tools and AI-driven insights to guide your career journey
              from discovery to your dream job.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Card className="group h-full hover-lift hover-glow border-border/50 hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6 md:p-8">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ HOW IT WORKS ============ */}
      <Section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerItem}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Your journey in <span className="gradient-text">4 simple steps</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From discovery to landing your dream career — we guide you every step of the way.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div key={i} variants={staggerItem} className="relative">
                <Card className="h-full border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift">
                  <CardContent className="p-6">
                    <div className="text-5xl font-bold text-primary/20 mb-4">{step.step}</div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>

                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ TESTIMONIALS ============ */}
      <Section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerItem}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by <span className="gradient-text">10,000+</span> career seekers
            </h2>
            <p className="text-lg text-muted-foreground">
              Real stories from people who transformed their careers with Pathalytics.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Card className="h-full hover-lift border-border/50">
                  <CardContent className="p-6 md:p-8">
                    <Quote className="w-8 h-8 text-primary/20 mb-4" />
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-white font-semibold">
                          {testimonial.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============ CTA SECTION ============ */}
      <Section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerItem}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-purple-600 to-pink-600 p-12 md:p-20 text-center"
          >
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to find your dream career?
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-10">
                Join thousands of professionals who discovered their perfect career path with Pathalytics. Get started for free today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-base px-8 h-12 bg-white text-primary hover:bg-white/90 shadow-lg"
                  onClick={() => navigate("/signup")}
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-12 border-white/30 text-white bg-white/10 hover:bg-white/20"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;