// src/components/Footer.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Twitter,
  Linkedin,
  Mail,
  ArrowRight,
  Heart,
  Facebook,
  Loader2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("https://formspree.io/f/xqenevdy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          message: `New newsletter subscription: ${email}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Subscription failed");
      }

      setStatus("success");
      toast.success("🎉 Subscribed! We'll be in touch soon.");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setStatus("error");
      console.error("Subscribe error:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Career Recommendation", href: "/career-recommendation" },
        { label: "Roadmaps", href: "/roadmaps" },
        { label: "AI Chatbot", href: "/chatbot" },
        { label: "Job Board", href: "/jobs" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Career Tips", href: "/career-tips" },
        { label: "Industry Insights", href: "/industry-insights" },
        { label: "Success Stories", href: "/success-stories" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms of Service", href: "/terms-of-service" },
        { label: "Contact", href: "mailto:pathalytics@gmail.com" },
      ],
    },
  ];

  const socialLinks = [
    { icon: Twitter, href: "https://x.com/pathalytics", label: "Twitter" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/pathalytics/", label: "LinkedIn" },
    { icon: Facebook, href: "https://www.facebook.com/profile.php?id=61581936212152", label: "Facebook" },
    { icon: Mail, href: "mailto:pathalytics@gmail.com", label: "Email" },
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Newsletter ── */}
        <div className="py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">Stay ahead in your career</h3>
            <p className="text-muted-foreground">
              Get weekly insights, tips, and career recommendations delivered to your inbox.
            </p>
          </div>
          <form
            onSubmit={handleSubscribe}
            className="flex w-full max-w-sm gap-2"
            noValidate
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
              aria-label="Email address for newsletter"
              className="bg-background"
            />
            <Button
              type="submit"
              className="shrink-0 gap-1 min-w-[120px]"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" && (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              )}
              {status === "success" && (
                <><CheckCircle2 className="w-4 h-4" /> Subscribed</>
              )}
              {(status === "idle" || status === "error") && (
                <>Subscribe <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>
        </div>

        <Separator />

        {/* ── Links Grid ── */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Pathalytics Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg">Pathalytics</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              AI-powered career guidance platform helping you discover and pursue your ideal career path.
            </p>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Chennai, Tamil Nadu, India</span>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-1.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer section columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-sm mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        {/* ── Bottom bar ── */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} Pathalytics. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-0.5" /> in Chennai, India
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;