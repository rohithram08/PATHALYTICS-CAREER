// src/components/resume/sampleResumeData.ts
import { ResumeData } from "./types";

export const SAMPLE_RESUME_DATA: ResumeData = {
  personalInfo: {
    fullName: "Alex Rivera",
    title: "Full-Stack Software Engineer & Distributed Systems Specialist",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    linkedin: "https://linkedin.com/in/alexrivera-dev",
    github: "https://github.com/alexrivera-tech",
    portfolio: "https://alexrivera.dev",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  },
  summary:
    "Results-driven Full-Stack Software Engineer with 3+ years of experience designing scalable microservices, low-latency REST/GraphQL APIs, and responsive React web applications. Proven track record reducing API response times by 42% and scaling cloud infrastructure to handle 1.2M daily active requests with 99.98% uptime.",
  skills: {
    technical: ["TypeScript", "JavaScript (ES6+)", "Python", "Go", "SQL", "HTML5/CSS3"],
    frameworks: ["React 18", "Next.js", "Node.js", "Express", "Tailwind CSS", "FastAPI"],
    tools: ["PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS (S3, ECS, Lambda)", "Git", "GitHub Actions"],
    soft: ["Agile/Scrum", "System Design", "Code Review Mentorship", "Cross-Functional Collaboration"],
  },
  experience: [
    {
      id: "exp-1",
      role: "Software Engineer II",
      company: "Apex Cloud Solutions",
      location: "San Francisco, CA",
      startDate: "2024-03",
      endDate: "Present",
      current: true,
      description: [
        "Architected an event-driven data ingestion pipeline processing 450K telemetry events/second using Node.js, Kafka, and PostgreSQL.",
        "Refactored relational query caching layers with Redis cluster, dropping 95th percentile latency from 320ms to 48ms.",
        "Implemented end-to-end automated CI/CD pipeline using GitHub Actions and Docker, reducing release deployment cycle from 4 days to 25 minutes.",
        "Mentored 4 junior engineers on distributed consensus patterns, code review hygiene, and test-driven development.",
      ],
    },
    {
      id: "exp-2",
      role: "Associate Frontend Engineer",
      company: "DataMetrics Labs",
      location: "Austin, TX",
      startDate: "2022-07",
      endDate: "2024-02",
      current: false,
      description: [
        "Engineered real-time interactive analytics dashboard in React, TypeScript, and TanStack Query serving 85,000 enterprise users.",
        "Optimized Web Vitals score from 64 to 96 by applying virtualized list windowing, dynamic code chunking, and asset tree-shaking.",
        "Collaborated with UX design team to build an accessible, reusable component library compliant with WCAG 2.1 AA standards.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "Bachelor of Science in Computer Science",
      institution: "University of California, Berkeley",
      field: "Artificial Intelligence & Distributed Systems",
      year: "2022",
      score: "GPA: 3.86 / 4.0",
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "FlowPulse — Real-Time API Gateway & Traffic Shaper",
      technologies: "Go, Redis, Docker, Prometheus",
      link: "https://github.com/alexrivera-tech/flowpulse",
      bullets: [
        "Built a high-throughput reverse proxy capable of routing 65,000 requests/sec with sliding-window token bucket rate limiting.",
        "Integrated real-time Prometheus metrics exporter and Grafana dashboard for automated anomaly detection.",
      ],
    },
    {
      id: "proj-2",
      title: "PathFindr — Career Intelligence & Skill Gap Evaluator",
      technologies: "React, Node.js, PostgreSQL, OpenAI API",
      link: "https://pathfindr.demo.app",
      bullets: [
        "Developed an intelligent career progression tool mapping student skill profiles against 15,000 live technical job postings.",
        "Achieved 98% positive user rating across 1,400 active student beta testers.",
      ],
    },
  ],
  certifications: [
    "AWS Certified Solutions Architect – Associate (2024)",
    "Meta Front-End Developer Professional Certificate (2023)",
  ],
};
