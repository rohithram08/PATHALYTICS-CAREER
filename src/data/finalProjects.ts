export interface FinalProject {
  title: string;
  description: string;
  requirements: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  /** Estimated time to complete */
  estimatedTime: string;
}

const finalProjects: Record<string, FinalProject[]> = {
  'software-developer': [
    {
      title: 'Full-Stack Task Manager',
      description: 'Build a task management app with user auth, CRUD operations, and a REST API backend.',
      requirements: ['User authentication', 'Task CRUD with categories', 'REST API', 'Responsive UI', 'Database integration'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
    {
      title: 'Portfolio Website',
      description: 'Create a personal portfolio with project showcase, contact form, and blog section.',
      requirements: ['Responsive design', 'Project gallery', 'Contact form', 'Dark/light mode'],
      difficulty: 'Beginner',
      estimatedTime: '1–2 weeks',
    },
  ],
  'web-developer': [
    {
      title: 'E-Commerce Store',
      description: 'Build a functional online store with product listings, cart, and checkout flow.',
      requirements: ['Product catalog', 'Shopping cart', 'Checkout process', 'Responsive design', 'Search & filters'],
      difficulty: 'Intermediate',
      estimatedTime: '4–6 weeks',
    },
  ],
    'mobile-app-developer': [
    {
      title: 'Social Media App',
      description: 'Create a mobile app with user profiles, posts, and real-time messaging.',
      requirements: ['User authentication', 'Post creation with images', 'Real-time chat', 'Push notifications'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
    {
      title: 'Fitness Tracker',
      description: 'Build a fitness tracking app with workout logs, progress charts, and goals.',
      requirements: ['Workout logging', 'Progress visualization', 'Goal tracking', 'Local data persistence'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'data-analyst': [
    {
      title: 'Business Intelligence Dashboard',
      description: 'Create an interactive dashboard analyzing real business data with KPIs and trend analysis.',
      requirements: ['Data cleaning pipeline', 'Interactive charts', 'KPI tracking', 'Filter controls', 'Export reports'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
    {
      title: 'Exploratory Data Analysis Report',
      description: 'Analyze a public dataset and present insights with visualizations and statistical findings.',
      requirements: ['Data cleaning', 'Statistical analysis', 'Charts and graphs', 'Written insights'],
      difficulty: 'Beginner',
      estimatedTime: '1–2 weeks',
    },
  ],
  'data-scientist': [
    {
      title: 'Predictive Analytics Pipeline',
      description: 'Build an end-to-end data pipeline that cleans data, trains a model, and displays predictions.',
      requirements: ['Data cleaning pipeline', 'ML model training', 'Visualization dashboard', 'Model evaluation metrics'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
    {
      title: 'Customer Churn Predictor',
      description: 'Predict customer churn using historical behavior data and explain key drivers.',
      requirements: ['Feature engineering', 'Classification model', 'Feature importance analysis', 'Deployment-ready API'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'ml-engineer': [
    {
      title: 'Production ML Pipeline',
      description: 'Build a complete MLOps pipeline with training, deployment, monitoring, and automated retraining.',
      requirements: ['Training pipeline', 'Model registry', 'API deployment', 'Drift monitoring', 'CI/CD for models'],
      difficulty: 'Advanced',
      estimatedTime: '8–10 weeks',
    },
    {
      title: 'Recommendation System',
      description: 'Build a personalized recommendation engine using collaborative or content-based filtering.',
      requirements: ['Data preprocessing', 'Recommendation algorithm', 'Evaluation metrics', 'API endpoint'],
      difficulty: 'Intermediate',
      estimatedTime: '4–5 weeks',
    },
  ],
  'ai-engineer': [
    {
      title: 'AI Chatbot with RAG',
      description: 'Build a domain-specific chatbot using retrieval-augmented generation and a vector database.',
      requirements: ['Vector database setup', 'Embedding pipeline', 'Conversation handling', 'Web UI', 'Evaluation suite'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
    {
      title: 'AI Document Analyzer',
      description: 'Build an LLM-powered tool that extracts insights and answers questions from PDF documents.',
      requirements: ['PDF parsing', 'Chunking strategy', 'LLM integration', 'Citation tracking', 'Output validation'],
      difficulty: 'Intermediate',
      estimatedTime: '4–5 weeks',
    },
  ],
  'cloud-engineer': [
    {
      title: 'Multi-Region Cloud Architecture',
      description: 'Deploy a containerized microservice across multiple regions with auto-scaling and failover.',
      requirements: ['Docker containerization', 'CI/CD pipeline', 'Multi-region deployment', 'Auto-scaling', 'Monitoring & logging'],
      difficulty: 'Advanced',
      estimatedTime: '5–7 weeks',
    },
    {
      title: 'Serverless API',
      description: 'Build a serverless backend with API Gateway, Lambda, and DynamoDB.',
      requirements: ['Serverless functions', 'API design', 'NoSQL database', 'IAM roles', 'Cost monitoring'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'devops-engineer': [
    {
      title: 'Infrastructure as Code Setup',
      description: 'Set up a complete CI/CD pipeline with Terraform, Kubernetes, and full observability.',
      requirements: ['Terraform modules', 'Kubernetes deployment', 'CI/CD pipeline', 'Monitoring dashboard', 'Automated rollback'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
    {
      title: 'GitOps Workflow',
      description: 'Build a GitOps-based deployment pipeline using ArgoCD or Flux.',
      requirements: ['Git-based config', 'Auto-sync', 'Multi-env promotion', 'Rollback strategy'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'systems-engineer': [
    {
      title: 'Distributed Caching System',
      description: 'Design and implement a distributed in-memory cache with replication and consistent hashing.',
      requirements: ['Consistent hashing', 'Replication strategy', 'Failover handling', 'Performance benchmarks'],
      difficulty: 'Advanced',
      estimatedTime: '6–7 weeks',
    },
  ],
  'cybersecurity-analyst': [
    {
      title: 'SIEM Dashboard',
      description: 'Build a Security Information and Event Management dashboard with anomaly detection.',
      requirements: ['Log aggregation', 'Anomaly detection rules', 'Alert system', 'Incident playbook', 'Real-time dashboard'],
      difficulty: 'Advanced',
      estimatedTime: '5–6 weeks',
    },
    {
      title: 'Vulnerability Scanner',
      description: 'Create a tool that scans for common vulnerabilities and generates security reports.',
      requirements: ['Vulnerability scanning', 'Report generation', 'Risk scoring', 'Remediation suggestions'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'ethical-hacker': [
    {
      title: 'Penetration Testing Lab',
      description: 'Set up a full pentest lab and document a complete engagement against vulnerable VMs.',
      requirements: ['Lab environment setup', 'Reconnaissance', 'Exploitation', 'Privilege escalation', 'Professional pentest report'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
  ],
  'network-engineer': [
    {
      title: 'Enterprise Network Design',
      description: 'Design a secure multi-site enterprise network with VPN, segmentation, and monitoring.',
      requirements: ['Network topology', 'VLAN segmentation', 'Site-to-site VPN', 'Firewall rules', 'Monitoring setup'],
      difficulty: 'Advanced',
      estimatedTime: '5–6 weeks',
    },
  ],
  'software-tester': [
    {
      title: 'Comprehensive Test Suite',
      description: 'Build a complete manual + automated testing suite for an existing web application.',
      requirements: ['Test plan', 'Test cases', 'Bug reports', 'Regression suite', 'Test execution report'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'automation-test-engineer': [
    {
      title: 'End-to-End Automation Framework',
      description: 'Build a Page Object Model framework using Selenium/Playwright with CI integration.',
      requirements: ['POM architecture', 'Cross-browser tests', 'CI/CD integration', 'HTML reports', 'Parallel execution'],
      difficulty: 'Advanced',
      estimatedTime: '5–6 weeks',
    },
  ],
  'ui-ux-designer': [
    {
      title: 'Design System',
      description: 'Create a comprehensive design system with component library, tokens, and documentation.',
      requirements: ['Component library', 'Design tokens', 'Accessibility guidelines', 'Interactive prototypes', 'Usage docs'],
      difficulty: 'Intermediate',
      estimatedTime: '4–5 weeks',
    },
    {
      title: 'UX Case Study',
      description: 'Conduct end-to-end user research and redesign a real product with measurable improvements.',
      requirements: ['User research', 'Personas & journey maps', 'Wireframes & prototypes', 'Usability testing', 'Final case study'],
      difficulty: 'Beginner',
      estimatedTime: '2–3 weeks',
    },
  ],
  'technical-product-manager': [
    {
      title: 'Product Launch Plan',
      description: 'Take a product from idea to launch with PRDs, metrics, and a go-to-market strategy.',
      requirements: ['Market research', 'PRD document', 'Roadmap', 'Success metrics', 'GTM plan'],
      difficulty: 'Advanced',
      estimatedTime: '4–6 weeks',
    },
  ],
  'research-scientist': [
    {
      title: 'Original Research Paper',
      description: 'Conduct novel research on a CS/AI problem and publish a paper-quality writeup.',
      requirements: ['Literature review', 'Hypothesis & methodology', 'Experiments', 'Results analysis', 'Paper writeup'],
      difficulty: 'Advanced',
      estimatedTime: '10–12 weeks',
    },
  ],
  'computer-vision-engineer': [
    {
      title: 'Real-Time Object Detection System',
      description: 'Build a real-time object detection app using YOLO or similar architectures.',
      requirements: ['Model selection', 'Training/fine-tuning', 'Real-time inference', 'Web/mobile UI', 'Performance benchmarks'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
  ],
  'blockchain-developer': [
    {
      title: 'DeFi Application',
      description: 'Build a decentralized finance app with smart contracts, frontend, and security audit.',
      requirements: ['Smart contracts', 'Frontend integration', 'Wallet connection', 'Security audit', 'Testnet deployment'],
      difficulty: 'Advanced',
      estimatedTime: '7–9 weeks',
    },
  ],
  'game-developer': [
    {
      title: '2D/3D Game',
      description: 'Build a complete game with multiple levels, AI enemies, and polished mechanics.',
      requirements: ['Game design doc', 'Core mechanics', 'AI behavior', 'UI/menus', 'Sound design'],
      difficulty: 'Advanced',
      estimatedTime: '8–10 weeks',
    },
  ],
  'ar-vr-developer': [
    {
      title: 'Immersive AR Experience',
      description: 'Build an AR app with object tracking, 3D models, and interactive elements.',
      requirements: ['AR framework setup', '3D model integration', 'User interactions', 'Performance optimization'],
      difficulty: 'Advanced',
      estimatedTime: '6–8 weeks',
    },
  ],
  'technical-support-engineer': [
    {
      title: 'Internal Support Knowledge Base',
      description: 'Build a searchable knowledge base with ticket tracking and analytics.',
      requirements: ['Article system', 'Search functionality', 'Ticket integration', 'Usage analytics'],
      difficulty: 'Intermediate',
      estimatedTime: '3–4 weeks',
    },
  ],
  'cs-lecturer': [
    {
      title: 'Course Curriculum & Platform',
      description: 'Design a complete CS course with lessons, assessments, and a learning platform.',
      requirements: ['Curriculum design', 'Lesson materials', 'Assessment rubrics', 'Learning platform', 'Student feedback loop'],
      difficulty: 'Intermediate',
      estimatedTime: '5–6 weeks',
    },
  ],
  'entrepreneur': [
    {
      title: 'MVP Launch',
      description: 'Build, launch, and validate a Minimum Viable Product with real users and metrics.',
      requirements: ['Problem validation', 'MVP build', 'Launch plan', 'User feedback collection', 'Iteration roadmap'],
      difficulty: 'Advanced',
      estimatedTime: '8–12 weeks',
    },
  ],
};

// Default project for careers without specific entries
const defaultProject: FinalProject = {
  title: 'Capstone Portfolio Project',
  description: 'Build a comprehensive project that demonstrates all skills learned throughout the roadmap.',
  requirements: ['Apply core concepts', 'Clean code practices', 'Documentation', 'Presentation/demo'],
  difficulty: 'Intermediate',
  estimatedTime: '4–6 weeks',
};

export function getFinalProjects(careerId: string): FinalProject[] {
  return finalProjects[careerId] || [defaultProject];
}