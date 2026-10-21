import {
  CountryCode,
  ExperienceLevel,
  SalaryRange,
  detectCountry,
  formatSalary,
  formatSalaryBoth,
} from '@/lib/locale';

export interface CareerRecommendation {
  id: string;
  title: string;
  description: string;
  skills: string[];
  interests: string[];
  personality: string[];
  workStyle: string[];
  /** Always stored in USD baseline — convert at display time */
  salary: SalaryRange;
  growth: string;
  demand: 'High' | 'Very High' | 'Growing';
}

// ───── Skill / Interest / Personality / Work-style options (unchanged) ─────
export const skills = [
  'Programming Languages', 'Web / App Development', 'Data Analysis',
  'Machine Learning', 'Cloud Computing', 'Networking',
  'Cybersecurity', 'UI/UX Design', 'Testing & Automation',
] as const;

export const interests = [
  'Problem Solving', 'Data & Research', 'Designing Interfaces',
  'Security & Ethical Hacking', 'Building Products', 'Teaching & Mentoring',
  'Innovation & Startups', 'Gaming / AR / VR',
] as const;

export const personalities = [
  'Analytical', 'Creative', 'Logical Thinker',
  'Detail-Oriented', 'Leadership-Oriented', 'Research-Focused',
] as const;

export const workStyles = [
  'Individual-focused', 'Team-based', 'Remote-friendly',
  'Structured environment', 'Flexible environment', 'Fast-paced startup style',
] as const;

// ───── 25 Careers (USD baseline ranges) ─────
export const careers: CareerRecommendation[] = [
  {
    id: 'software-developer',
    title: 'Software Developer / Software Engineer',
    description: 'Design, develop, test, and maintain software applications across various platforms and domains.',
    skills: ['Programming Languages', 'Web / App Development', 'Testing & Automation'],
    interests: ['Problem Solving', 'Building Products'],
    personality: ['Logical Thinker', 'Detail-Oriented', 'Analytical'],
    workStyle: ['Team-based', 'Remote-friendly', 'Flexible environment'],
    salary: { fresher: { min: 60000, max: 90000 }, experienced: { min: 100000, max: 160000 } },
    growth: '+25%', demand: 'High',
  },
  {
    id: 'web-developer',
    title: 'Web Developer',
    description: 'Build and maintain websites and web applications using modern frontend and backend technologies.',
    skills: ['Web / App Development', 'Programming Languages', 'UI/UX Design'],
    interests: ['Building Products', 'Designing Interfaces', 'Problem Solving'],
    personality: ['Creative', 'Detail-Oriented', 'Logical Thinker'],
    workStyle: ['Remote-friendly', 'Flexible environment', 'Team-based'],
    salary: { fresher: { min: 50000, max: 80000 }, experienced: { min: 90000, max: 140000 } },
    growth: '+23%', demand: 'High',
  },
  {
    id: 'mobile-app-developer',
    title: 'Mobile App Developer',
    description: 'Create native and cross-platform mobile applications for iOS and Android devices.',
    skills: ['Web / App Development', 'Programming Languages', 'UI/UX Design'],
    interests: ['Building Products', 'Designing Interfaces', 'Problem Solving'],
    personality: ['Creative', 'Detail-Oriented', 'Logical Thinker'],
    workStyle: ['Remote-friendly', 'Flexible environment', 'Individual-focused'],
    salary: { fresher: { min: 60000, max: 90000 }, experienced: { min: 100000, max: 155000 } },
    growth: '+22%', demand: 'High',
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    description: 'Analyze data sets to identify trends, create visualizations, and support business decisions.',
    skills: ['Data Analysis', 'Programming Languages'],
    interests: ['Data & Research', 'Problem Solving'],
    personality: ['Analytical', 'Detail-Oriented', 'Logical Thinker'],
    workStyle: ['Structured environment', 'Team-based', 'Remote-friendly'],
    salary: { fresher: { min: 45000, max: 70000 }, experienced: { min: 80000, max: 120000 } },
    growth: '+20%', demand: 'High',
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Extract insights from complex data sets using statistical analysis and machine learning techniques.',
    skills: ['Data Analysis', 'Machine Learning', 'Programming Languages'],
    interests: ['Data & Research', 'Problem Solving', 'Innovation & Startups'],
    personality: ['Analytical', 'Research-Focused', 'Logical Thinker'],
    workStyle: ['Individual-focused', 'Remote-friendly', 'Flexible environment'],
    salary: { fresher: { min: 80000, max: 115000 }, experienced: { min: 130000, max: 190000 } },
    growth: '+28%', demand: 'Very High',
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    description: 'Build, deploy, and maintain machine learning models and systems at scale.',
    skills: ['Machine Learning', 'Programming Languages', 'Cloud Computing', 'Data Analysis'],
    interests: ['Data & Research', 'Problem Solving', 'Innovation & Startups'],
    personality: ['Analytical', 'Research-Focused', 'Logical Thinker'],
    workStyle: ['Remote-friendly', 'Flexible environment', 'Team-based'],
    salary: { fresher: { min: 90000, max: 130000 }, experienced: { min: 150000, max: 230000 } },
    growth: '+40%', demand: 'Very High',
  },
  {
    id: 'ai-engineer',
    title: 'AI Engineer',
    description: 'Design and implement AI solutions including NLP, computer vision, and deep learning systems.',
    skills: ['Machine Learning', 'Programming Languages', 'Cloud Computing'],
    interests: ['Innovation & Startups', 'Data & Research', 'Problem Solving'],
    personality: ['Research-Focused', 'Analytical', 'Creative'],
    workStyle: ['Flexible environment', 'Remote-friendly', 'Fast-paced startup style'],
    salary: { fresher: { min: 95000, max: 135000 }, experienced: { min: 160000, max: 240000 } },
    growth: '+45%', demand: 'Very High',
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    description: 'Design, implement, and manage cloud infrastructure and services for scalable applications.',
    skills: ['Cloud Computing', 'Networking', 'Programming Languages'],
    interests: ['Problem Solving', 'Building Products'],
    personality: ['Logical Thinker', 'Analytical', 'Detail-Oriented'],
    workStyle: ['Team-based', 'Remote-friendly', 'Structured environment'],
    salary: { fresher: { min: 75000, max: 105000 }, experienced: { min: 120000, max: 190000 } },
    growth: '+35%', demand: 'Very High',
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    description: 'Bridge development and operations through automation, CI/CD pipelines, and infrastructure management.',
    skills: ['Cloud Computing', 'Programming Languages', 'Testing & Automation', 'Networking'],
    interests: ['Building Products', 'Problem Solving'],
    personality: ['Logical Thinker', 'Detail-Oriented', 'Analytical'],
    workStyle: ['Team-based', 'Remote-friendly', 'Fast-paced startup style'],
    salary: { fresher: { min: 75000, max: 105000 }, experienced: { min: 120000, max: 175000 } },
    growth: '+24%', demand: 'High',
  },
  {
    id: 'systems-engineer',
    title: 'Systems Engineer',
    description: 'Design, implement, and maintain complex IT infrastructure and system architectures.',
    skills: ['Networking', 'Cloud Computing', 'Programming Languages'],
    interests: ['Problem Solving', 'Building Products'],
    personality: ['Logical Thinker', 'Analytical', 'Detail-Oriented'],
    workStyle: ['Structured environment', 'Team-based', 'Individual-focused'],
    salary: { fresher: { min: 65000, max: 95000 }, experienced: { min: 105000, max: 160000 } },
    growth: '+18%', demand: 'High',
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    description: 'Protect organizations from cyber threats through monitoring, analysis, and incident response.',
    skills: ['Cybersecurity', 'Networking', 'Programming Languages'],
    interests: ['Security & Ethical Hacking', 'Problem Solving', 'Data & Research'],
    personality: ['Detail-Oriented', 'Analytical', 'Logical Thinker'],
    workStyle: ['Structured environment', 'Team-based', 'Individual-focused'],
    salary: { fresher: { min: 65000, max: 95000 }, experienced: { min: 105000, max: 155000 } },
    growth: '+32%', demand: 'Very High',
  },
  {
    id: 'ethical-hacker',
    title: 'Ethical Hacker',
    description: 'Conduct authorized penetration testing to identify vulnerabilities and strengthen security.',
    skills: ['Cybersecurity', 'Networking', 'Programming Languages'],
    interests: ['Security & Ethical Hacking', 'Problem Solving'],
    personality: ['Analytical', 'Creative', 'Detail-Oriented'],
    workStyle: ['Individual-focused', 'Flexible environment', 'Remote-friendly'],
    salary: { fresher: { min: 70000, max: 100000 }, experienced: { min: 115000, max: 180000 } },
    growth: '+35%', demand: 'Very High',
  },
  {
    id: 'network-engineer',
    title: 'Network Engineer',
    description: 'Design, implement, and maintain network infrastructure including routers, switches, and firewalls.',
    skills: ['Networking', 'Cybersecurity', 'Cloud Computing'],
    interests: ['Problem Solving', 'Building Products'],
    personality: ['Logical Thinker', 'Detail-Oriented', 'Analytical'],
    workStyle: ['Structured environment', 'Team-based', 'Individual-focused'],
    salary: { fresher: { min: 55000, max: 85000 }, experienced: { min: 90000, max: 140000 } },
    growth: '+15%', demand: 'High',
  },
  {
    id: 'software-tester',
    title: 'Software Tester',
    description: 'Ensure software quality through manual and automated testing methodologies.',
    skills: ['Testing & Automation', 'Programming Languages'],
    interests: ['Problem Solving', 'Data & Research'],
    personality: ['Detail-Oriented', 'Analytical', 'Logical Thinker'],
    workStyle: ['Team-based', 'Structured environment', 'Remote-friendly'],
    salary: { fresher: { min: 45000, max: 70000 }, experienced: { min: 75000, max: 115000 } },
    growth: '+15%', demand: 'High',
  },
  {
    id: 'automation-test-engineer',
    title: 'Automation Test Engineer',
    description: 'Develop and maintain automated test frameworks and scripts for continuous testing.',
    skills: ['Testing & Automation', 'Programming Languages', 'Web / App Development'],
    interests: ['Problem Solving', 'Building Products'],
    personality: ['Logical Thinker', 'Detail-Oriented', 'Analytical'],
    workStyle: ['Team-based', 'Remote-friendly', 'Flexible environment'],
    salary: { fresher: { min: 60000, max: 85000 }, experienced: { min: 95000, max: 145000 } },
    growth: '+20%', demand: 'High',
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    description: 'Create intuitive and visually appealing user interfaces and experiences for digital products.',
    skills: ['UI/UX Design', 'Web / App Development'],
    interests: ['Designing Interfaces', 'Building Products', 'Problem Solving'],
    personality: ['Creative', 'Detail-Oriented', 'Analytical'],
    workStyle: ['Flexible environment', 'Remote-friendly', 'Team-based'],
    salary: { fresher: { min: 55000, max: 85000 }, experienced: { min: 90000, max: 145000 } },
    growth: '+18%', demand: 'High',
  },
  {
    id: 'technical-product-manager',
    title: 'Technical Product Manager',
    description: 'Lead product development by bridging business goals with technical implementation.',
    skills: ['Web / App Development', 'Data Analysis'],
    interests: ['Building Products', 'Problem Solving', 'Innovation & Startups'],
    personality: ['Leadership-Oriented', 'Analytical', 'Creative'],
    workStyle: ['Team-based', 'Fast-paced startup style', 'Flexible environment'],
    salary: { fresher: { min: 85000, max: 115000 }, experienced: { min: 130000, max: 200000 } },
    growth: '+22%', demand: 'High',
  },
  {
    id: 'research-scientist',
    title: 'Research Scientist',
    description: 'Conduct cutting-edge research in computer science, AI, or related fields.',
    skills: ['Machine Learning', 'Programming Languages', 'Data Analysis'],
    interests: ['Data & Research', 'Innovation & Startups', 'Problem Solving'],
    personality: ['Research-Focused', 'Analytical', 'Creative'],
    workStyle: ['Individual-focused', 'Flexible environment', 'Structured environment'],
    salary: { fresher: { min: 80000, max: 115000 }, experienced: { min: 130000, max: 210000 } },
    growth: '+30%', demand: 'Very High',
  },
  {
    id: 'computer-vision-engineer',
    title: 'Computer Vision Engineer',
    description: 'Develop systems that can interpret and analyze visual information from images and videos.',
    skills: ['Machine Learning', 'Programming Languages', 'Data Analysis'],
    interests: ['Data & Research', 'Innovation & Startups', 'Problem Solving'],
    personality: ['Research-Focused', 'Analytical', 'Detail-Oriented'],
    workStyle: ['Team-based', 'Flexible environment', 'Remote-friendly'],
    salary: { fresher: { min: 90000, max: 125000 }, experienced: { min: 140000, max: 220000 } },
    growth: '+35%', demand: 'Very High',
  },
  {
    id: 'blockchain-developer',
    title: 'Blockchain Developer',
    description: 'Build decentralized applications and smart contracts on blockchain platforms.',
    skills: ['Programming Languages', 'Web / App Development', 'Cybersecurity'],
    interests: ['Innovation & Startups', 'Building Products', 'Security & Ethical Hacking'],
    personality: ['Logical Thinker', 'Analytical', 'Creative'],
    workStyle: ['Remote-friendly', 'Fast-paced startup style', 'Flexible environment'],
    salary: { fresher: { min: 75000, max: 110000 }, experienced: { min: 120000, max: 200000 } },
    growth: '+28%', demand: 'Growing',
  },
  {
    id: 'game-developer',
    title: 'Game Developer',
    description: 'Create interactive games for various platforms including PC, console, and mobile.',
    skills: ['Programming Languages', 'Web / App Development', 'UI/UX Design'],
    interests: ['Gaming / AR / VR', 'Building Products', 'Designing Interfaces'],
    personality: ['Creative', 'Logical Thinker', 'Detail-Oriented'],
    workStyle: ['Team-based', 'Flexible environment', 'Fast-paced startup style'],
    salary: { fresher: { min: 50000, max: 80000 }, experienced: { min: 90000, max: 155000 } },
    growth: '+18%', demand: 'Growing',
  },
  {
    id: 'ar-vr-developer',
    title: 'AR / VR Developer',
    description: 'Build immersive augmented and virtual reality experiences and applications.',
    skills: ['Programming Languages', 'Web / App Development', 'UI/UX Design'],
    interests: ['Gaming / AR / VR', 'Innovation & Startups', 'Designing Interfaces'],
    personality: ['Creative', 'Analytical', 'Logical Thinker'],
    workStyle: ['Team-based', 'Flexible environment', 'Fast-paced startup style'],
    salary: { fresher: { min: 65000, max: 95000 }, experienced: { min: 105000, max: 175000 } },
    growth: '+25%', demand: 'Growing',
  },
  {
    id: 'technical-support-engineer',
    title: 'Technical Support Engineer',
    description: 'Provide technical assistance and troubleshooting support for software and hardware products.',
    skills: ['Networking', 'Programming Languages', 'Cloud Computing'],
    interests: ['Problem Solving', 'Teaching & Mentoring'],
    personality: ['Detail-Oriented', 'Analytical', 'Logical Thinker'],
    workStyle: ['Team-based', 'Structured environment', 'Remote-friendly'],
    salary: { fresher: { min: 40000, max: 65000 }, experienced: { min: 70000, max: 110000 } },
    growth: '+12%', demand: 'High',
  },
  {
    id: 'cs-lecturer',
    title: 'Computer Science Lecturer / Trainer',
    description: 'Teach and train students or professionals in computer science concepts and technologies.',
    skills: ['Programming Languages', 'Data Analysis', 'Web / App Development'],
    interests: ['Teaching & Mentoring', 'Data & Research', 'Problem Solving'],
    personality: ['Leadership-Oriented', 'Creative', 'Analytical'],
    workStyle: ['Structured environment', 'Individual-focused', 'Flexible environment'],
    salary: { fresher: { min: 45000, max: 75000 }, experienced: { min: 80000, max: 130000 } },
    growth: '+10%', demand: 'High',
  },
  {
    id: 'entrepreneur',
    title: 'Entrepreneur',
    description: 'Start and grow technology-based businesses and startups.',
    skills: ['Web / App Development', 'Cloud Computing', 'Data Analysis'],
    interests: ['Innovation & Startups', 'Building Products', 'Problem Solving'],
    personality: ['Leadership-Oriented', 'Creative', 'Analytical'],
    workStyle: ['Fast-paced startup style', 'Flexible environment', 'Individual-focused'],
    salary: { fresher: { min: 0, max: 50000 }, experienced: { min: 60000, max: 500000 } },
    growth: '+15%', demand: 'Growing',
  },
];

// =======================================================
// Recommendation Engine
// =======================================================

export interface UserPreferences {
  skills: string[];
  interests: string[];
  personality: string[];
  workStyle: string[];
  /** Optional contact info — used to detect locale */
  contact?: {
    phone?: string;
    email?: string;
  };
  /** Optional experience level for salary display */
  experience?: ExperienceLevel;
  /** Optional manual country override */
  country?: CountryCode;
}

export interface RecommendationResult extends CareerRecommendation {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedInterests: string[];
  matchedPersonality: string[];
  matchedWorkStyle: string[];
  readinessPercentage: number;
  targetPreparationTimeline: string;
  recommendedProjects: Array<{
    title: string;
    tech: string;
    description: string;
  }>;
  explanation: string[];
  /** Locale-formatted salary strings */
  salaryDisplay: {
    fresher: string;
    experienced: string;
    primary: string;          // formatted based on requested experience level
    country: string;
    currency: string;
  };
}

const CAREER_PROJECTS: Record<string, Array<{ title: string; tech: string; description: string }>> = {
  'software-developer': [
    { title: 'Full-Stack Issue Tracking & Scrum Tool', tech: 'TypeScript, React, Node.js, PostgreSQL', description: 'Design an end-to-end task management tool with JWT auth, role permissions, and GitHub webhook integration.' },
    { title: 'High-Throughput API Gateway & Cache', tech: 'Node.js, Express, Redis, Docker', description: 'Build a reverse-proxy gateway with distributed rate limiting, cache invalidation, and metrics logging.' },
  ],
  'web-developer': [
    { title: 'Interactive Analytics & SaaS Portal', tech: 'React, Tailwind CSS, Recharts, Vite', description: 'Responsive web platform featuring light/dark themes, accessible forms, and rich data visualization.' },
    { title: 'Headless Content & Blog Engine', tech: 'Next.js / Vite, Markdown/MDX, REST API', description: 'Fast, SEO-optimized content platform with dynamic routing, search, and static site generation.' },
  ],
  'data-analyst': [
    { title: 'E-Commerce Cohort & Churn Dashboard', tech: 'SQL, Python, Pandas, PowerBI / Tableau', description: 'Analyze customer transactional logs to reveal 90-day retention curves, LTV, and basket size trends.' },
    { title: 'Marketing Attribution & ROI Modeling', tech: 'SQL, Python, Matplotlib, Seaborn', description: 'Build statistical models attributing multi-touch customer conversions to optimize ad spend.' },
  ],
  'data-scientist': [
    { title: 'Predictive Customer Churn Pipeline', tech: 'Python, Scikit-Learn, XGBoost, FastAPI', description: 'Train, validate, and serve an ensemble ML model with feature importance (SHAP) explanations.' },
    { title: 'NLP Sentiment & Entity Extraction Engine', tech: 'HuggingFace, PyTorch, Transformers', description: 'Fine-tune a lightweight BERT model to categorize customer feedback and ticket urgency.' },
  ],
  'cybersecurity-analyst': [
    { title: 'Automated Vulnerability & Port Scanner', tech: 'Python, Nmap, Scapy, Docker', description: 'Construct a security scanning script that detects open ports, outdated SSL ciphers, and misconfigurations.' },
    { title: 'Zero-Trust Role-Based Access Audit System', tech: 'Node.js, OAuth 2.0, OpenID Connect', description: 'Implement token revocation, anomalous login detection, and least-privilege permission validation.' },
  ],
  'cloud-engineer': [
    { title: 'Multi-Region Terraform Infrastructure as Code', tech: 'Terraform, AWS/GCP, Docker, Nginx', description: 'Provision load balancers, auto-scaling groups, and private VPC networks with zero-downtime blue/green deployment.' },
    { title: 'Kubernetes Microservices Observability Stack', tech: 'K8s, Prometheus, Grafana, Helm', description: 'Containerize and orchestrate a 3-tier microservice architecture with auto-healing and live alerting.' },
  ],
  'ui-ux-designer': [
    { title: 'Design System & Component Library (Figma)', tech: 'Figma, Design Tokens, WCAG 2.1 AA', description: 'Comprehensive design system including typography scales, semantic color palettes, and responsive mobile mockups.' },
    { title: 'Fintech Onboarding Redesign & Usability Testing', tech: 'User Research, Wireframing, Prototyping', description: 'Conduct usability interviews with 5 participants, iterate wireframes, and increase task completion rate.' },
  ],
  'mobile-app-developer': [
    { title: 'Cross-Platform Habit & Goal Tracker', tech: 'React Native / Flutter, SQLite, Push Notifications', description: 'Offline-first mobile application with local caching, streak tracking, and interactive calendar views.' },
    { title: 'Location-Based Event Finder App', tech: 'React Native, Google Maps API, REST', description: 'Interactive mobile app that queries nearby venues, displays real-time directions, and saves favorites.' },
  ],
};

function getProjectsForCareer(careerId: string, careerTitle: string, careerSkills: string[]) {
  if (CAREER_PROJECTS[careerId]) return CAREER_PROJECTS[careerId];
  return [
    {
      title: `${careerTitle} Capstone Project`,
      tech: careerSkills.slice(0, 3).join(', ') || 'Core Technologies',
      description: `Build a production-quality application demonstrating practical competency in ${careerSkills.slice(0, 2).join(' and ') || 'this field'}.`,
    },
    {
      title: 'Industry Portfolio Case Study',
      tech: 'GitHub, CI/CD, Documentation',
      description: 'Document architecture, design decisions, unit tests, and live deployment link for recruiter evaluation.',
    },
  ];
}

/**
 * Calculates deterministic career recommendations and calibrated readiness scores.
 *
 * Scoring Model Assumptions & Methodology:
 * - Dimensional Weights: Skills (50%), Interests (25%), Personality (15%), Work Style (10%).
 * - Bounded Calibration:
 *   - Lower bound (20%): Reflects foundational transferable aptitudes; prevents demotivating zero-scores.
 *   - Upper bound (98%): Reflects practical limits; no algorithmic assessment guarantees hiring without interviews.
 * - Limitation & Nature: This is a heuristic curriculum-planning and readiness score intended for
 *   guided roadmap progression and skill-gap closure, NOT an empirical or scientific probability of employment.
 *
 * @param preferences User traits, skills, and locale preferences (handles null/undefined gracefully)
 * @returns Sorted recommendation results with skill gaps, timelines, and capstone briefs
 */
export function getCareerRecommendations(
  preferences?: UserPreferences | null
): RecommendationResult[] {
  if (!preferences || typeof preferences !== 'object') return [];

  const userSkills = Array.isArray(preferences.skills) ? preferences.skills : [];
  const userInterests = Array.isArray(preferences.interests) ? preferences.interests : [];
  const userPersonality = Array.isArray(preferences.personality) ? preferences.personality : [];
  const userWorkStyle = Array.isArray(preferences.workStyle) ? preferences.workStyle : [];
  const {
    contact,
    experience = 'fresher',
    country: manualCountry,
  } = preferences;

  const hasPreferences =
    userSkills.length > 0 ||
    userInterests.length > 0 ||
    userPersonality.length > 0 ||
    userWorkStyle.length > 0;

  if (!hasPreferences) return [];

  // Detect country: manual override → phone → email → US fallback
  const country: CountryCode =
    manualCountry ||
    detectCountry({
      phone: contact?.phone,
      email: contact?.email,
      fallback: 'US',
    });

  const results: RecommendationResult[] = careers.map((career) => {
    const matchedSkills = career.skills.filter((s) => userSkills.includes(s));
    const missingSkills = career.skills.filter((s) => !userSkills.includes(s));
    const matchedInterests = career.interests.filter((i) => userInterests.includes(i));
    const matchedPersonality = career.personality.filter((p) => userPersonality.includes(p));
    const matchedWorkStyle = career.workStyle.filter((w) => userWorkStyle.includes(w));

    // Calibrated readiness formula
    const skillsRatio = career.skills.length > 0 ? matchedSkills.length / career.skills.length : 1;
    const interestsRatio = career.interests.length > 0 ? matchedInterests.length / career.interests.length : 0.5;
    const personalityRatio = career.personality.length > 0 ? matchedPersonality.length / career.personality.length : 0.5;
    const workStyleRatio = career.workStyle.length > 0 ? matchedWorkStyle.length / career.workStyle.length : 0.5;

    const rawReadiness = Math.round(
      (skillsRatio * 0.50 +
       interestsRatio * 0.25 +
       personalityRatio * 0.15 +
       workStyleRatio * 0.10) * 100
    );

    const readinessPercentage = Math.min(98, Math.max(20, rawReadiness));

    let targetPreparationTimeline = '3–6 months structured roadmap';
    if (readinessPercentage >= 80) {
      targetPreparationTimeline = 'Ready to interview & build portfolio';
    } else if (readinessPercentage >= 60) {
      targetPreparationTimeline = '1–2 months targeted practice';
    } else if (readinessPercentage >= 40) {
      targetPreparationTimeline = '2–4 months skill development';
    }

    const matchScore =
      matchedSkills.length * 3 +
      matchedInterests.length * 2 +
      matchedPersonality.length * 1.5 +
      matchedWorkStyle.length * 1;

    const explanation: string[] = [];
    if (matchedSkills.length) {
      explanation.push(`Strong foundation in ${matchedSkills.join(', ')}.`);
    }
    if (missingSkills.length) {
      explanation.push(`Growth opportunity: Learn ${missingSkills.join(', ')} to become fully job-ready.`);
    }
    if (matchedInterests.length) {
      explanation.push(`Aligns with your interest in ${matchedInterests.join(' and ').toLowerCase()}.`);
    }
    if (matchedPersonality.length) {
      explanation.push(`Complements your ${matchedPersonality.join(', ').toLowerCase()} problem-solving style.`);
    }
    if (matchedWorkStyle.length) {
      explanation.push(`Matches your preference for ${matchedWorkStyle.join(', ').toLowerCase()} environments.`);
    }

    const both = formatSalaryBoth(career.salary, country);
    const salaryDisplay = {
      ...both,
      primary: formatSalary(career.salary, country, experience),
    };

    const recommendedProjects = getProjectsForCareer(career.id, career.title, career.skills);

    return {
      ...career,
      matchScore,
      matchedSkills,
      missingSkills,
      matchedInterests,
      matchedPersonality,
      matchedWorkStyle,
      readinessPercentage,
      targetPreparationTimeline,
      recommendedProjects,
      explanation,
      salaryDisplay,
    };
  });

  return results
    .filter((r) => r.matchScore > 0 || r.readinessPercentage > 30)
    .sort((a, b) => b.readinessPercentage - a.readinessPercentage || b.matchScore - a.matchScore);
}