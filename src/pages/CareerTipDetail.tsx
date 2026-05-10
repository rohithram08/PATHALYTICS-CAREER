// src/pages/CareerTipDetail.tsx
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  Mic,
  Target,
  MessageCircle,
  BookOpen,
  Star,
  Briefcase,
  Code2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  heading?: string;
  body?: string;
  bullets?: string[];
  numbered?: string[];
  tip?: string;
  warning?: string;
}

interface ArticleData {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  level: "Beginner" | "Intermediate" | "All Levels";
  icon: React.ElementType;
  sections: Section[];
  keyTakeaways: string[];
}

// ─── Article Content ─────────────────────────────────────────────────────────

const articles: ArticleData[] = [
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
    sections: [
      {
        body: "Most candidates approach technical interviews the wrong way — they open LeetCode, start with problem #1, and grind randomly until the interview date. This approach leads to burnout, knowledge gaps, and low confidence. A structured plan fixes all three.",
      },
      {
        heading: "Week 1 — Data Structures Foundation",
        body: "The first week is about understanding how data is stored and accessed. Do not skip this step even if you think you know it. Interviewers test edge cases, not just happy paths.",
        numbered: [
          "Arrays and strings — two-pointer and sliding window patterns (Days 1–2)",
          "Linked lists — traversal, reversal, fast/slow pointer (Day 3)",
          "Stacks and queues — monotonic stack, BFS queue (Day 4)",
          "Hash maps and sets — frequency counting, grouping (Day 5)",
          "Review everything and solve 5 easy problems from each category (Days 6–7)",
        ],
        tip: "Use Neetcode.io's roadmap to pick problems by pattern, not by difficulty. Solving 3 problems of the same pattern beats solving 10 random ones.",
      },
      {
        heading: "Week 2 — Algorithms and Patterns",
        body: "Now that you understand the containers, learn how to move data through them efficiently.",
        numbered: [
          "Binary search — on sorted arrays and on answer ranges (Days 1–2)",
          "Trees — DFS (pre/in/post-order), BFS, and recursion (Days 3–4)",
          "Graphs — BFS, DFS, topological sort, union-find (Days 5–6)",
          "Dynamic programming — top-down with memoisation, bottom-up tabulation (Day 7)",
        ],
        warning: "Most candidates skip graphs and DP because they are hard. Do not. They appear in roughly 40% of on-site rounds at top companies.",
      },
      {
        heading: "Week 3 — System Design Basics",
        body: "Even for junior roles, a basic understanding of system design will set you apart. You are not expected to design Twitter — you are expected to reason clearly.",
        bullets: [
          "Understand load balancers, databases (SQL vs NoSQL), and caching at a high level",
          "Read the Grokking System Design Primer on GitHub (it's free)",
          "Practice designing a URL shortener and a simple chat system out loud",
          "Learn to clarify requirements before designing — interviewers reward this",
          "Watch 2–3 mock system design videos on YouTube to calibrate your level",
        ],
      },
      {
        heading: "Week 4 — Behavioural Prep and Mock Interviews",
        body: "Technical skill gets you to the final round. Behavioural prep determines whether you pass it. Do not leave this to the last day.",
        numbered: [
          "Write out 6–8 STAR stories from past experience (internships, projects, group work)",
          "Prepare answers for: biggest failure, conflict with a teammate, challenge you overcame",
          "Do 2 timed mock interviews (use Pramp, Interviewing.io, or ask a friend)",
          "Record yourself explaining a solution out loud — watch it back once",
          "Prepare 3 thoughtful questions to ask the interviewer about the role and team",
        ],
        tip: "Thinking out loud during coding rounds is more important than getting the right answer. Practise narrating your thought process even when you are stuck.",
      },
      {
        heading: "On the Day",
        bullets: [
          "Read the problem twice before writing a single line of code",
          "State your approach and time complexity before coding",
          "Start with a brute force solution, then optimise",
          "Test your code on 2–3 examples before saying you are done",
          "If you are stuck, say so — then ask if you can work through a simpler version first",
        ],
      },
    ],
    keyTakeaways: [
      "Structure beats volume — 4 focused weeks outperforms 3 months of random grinding",
      "Patterns matter more than memorising solutions",
      "System design is tested even at junior levels — prepare at least the basics",
      "Thinking out loud is a skill, and it needs practice",
      "Behavioural prep is not optional — it wins and loses final rounds",
    ],
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
    sections: [
      {
        body: "The most common mistake beginners make is waiting until they feel 'ready' to build portfolio projects. The reality is — your portfolio is how you become ready. Employers do not expect perfection from a first-timer. They want evidence that you can learn, build, and ship something.",
      },
      {
        heading: "What Makes a Good Portfolio Project?",
        body: "A good project does not need to be original. It needs to be complete, documented, and explained clearly.",
        bullets: [
          "It solves a real problem, even a small one (your own problem is fine)",
          "It is live and accessible — a deployed URL beats a GitHub link every time",
          "It has a clear README explaining what it does, how to run it, and what you learned",
          "You can talk about every decision you made when asked",
        ],
        tip: "Clone a simple app you use every day — a task manager, a budget tracker, a weather app. Add one twist that makes it yours. The learning happens in the building, not the ideation.",
      },
      {
        heading: "3 Project Ideas That Actually Work",
        numbered: [
          "Full-stack CRUD app — a simple notes or task app with user auth. Shows you can connect a frontend to a backend and handle data.",
          "API integration project — pull data from a public API (weather, movies, sports) and display it with filters and search. Shows you can work with real-world data.",
          "A tool you actually use — automate something tedious in your own life. A script that formats your lecture notes, a dashboard for your spending. Authenticity comes through.",
        ],
      },
      {
        heading: "How to Present Your Work",
        body: "The project itself is only half the portfolio. How you present it matters just as much.",
        bullets: [
          "Write a short case study for each project — the problem, your approach, the outcome",
          "Include a screenshot or screen recording on your portfolio site",
          "List the technologies used and link to the live site and the GitHub repo",
          "Mention what you would improve if you had more time — this shows maturity",
        ],
        warning: "Do not include projects you cannot explain. If an interviewer asks 'why did you use Redux here?' and you cannot answer, it hurts more than not having the project.",
      },
      {
        heading: "Hosting Your Portfolio",
        bullets: [
          "Vercel and Netlify are free and deploy from GitHub in one click",
          "GitHub Pages works well for static sites",
          "Use your own domain if you can — it costs about £10/year and looks professional",
          "Keep the portfolio site itself simple — your projects should be the star, not a flashy animation",
        ],
      },
    ],
    keyTakeaways: [
      "Three quality projects beat ten unfinished ones",
      "Deploy everything — a live URL makes the portfolio real",
      "Write a short case study for each project, not just a link",
      "Only include projects you can confidently discuss in an interview",
      "Start now — your first project does not need to be impressive, it needs to exist",
    ],
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
    sections: [
      {
        body: "Recruiters spend an average of 6 seconds on a LinkedIn profile before deciding whether to reach out. Most profiles lose them in the first two. These 10 changes are listed in order of impact — start at the top.",
      },
      {
        heading: "1. Rewrite Your Headline",
        body: "Your headline is the single highest-impact field on your profile. Most people write their job title. That is a wasted opportunity. Instead, write who you are and what you offer.",
        tip: "Instead of 'Computer Science Student at XYZ University', try 'Aspiring Full-Stack Developer | React · Node.js · Building projects that solve real problems'. Keywords matter for LinkedIn search.",
      },
      {
        heading: "2. Add a Professional Profile Photo",
        body: "Profiles with photos get 21x more views. It does not need to be a studio shot — a clear, well-lit photo with a plain background works perfectly. Smile. Dress the way you would for an interview at the company you want to work for.",
      },
      {
        heading: "3. Write an About Section That Tells a Story",
        body: "Most About sections are either empty or a list of skills. Write 3–4 short paragraphs: who you are, what you are working on, what you are looking for, and how to reach you. Write in first person — it reads warmer.",
      },
      {
        heading: "4–10. The Quick Wins",
        numbered: [
          "Turn on Open to Work — set it to visible only to recruiters if you are worried about your current employer seeing it.",
          "Add all your skills — LinkedIn's algorithm surfaces you in search based on skills listed. Aim for 20+ relevant skills.",
          "Request 2–3 recommendations — ask a lecturer, a project teammate, or a manager from a part-time job. A recommendation adds credibility that a self-written profile cannot.",
          "Add your projects under Experience or the Projects section — include the tech stack, a one-line description, and a link if it is live.",
          "Customise your LinkedIn URL — change it to linkedin.com/in/yourname instead of a random string. Goes on your CV too.",
          "Follow companies you want to work for and engage with their posts — recruiters see who engages with their content.",
          "Post once a week about something you built or learned — even a short note. Profiles that post get significantly more visibility than those that do not.",
        ],
      },
    ],
    keyTakeaways: [
      "Your headline and photo are seen first — fix these before anything else",
      "Keywords in your headline and skills sections drive recruiter search results",
      "Recommendations from real people add credibility you cannot write yourself",
      "An active profile (posting, engaging) gets dramatically more visibility",
      "Customise your URL and add it to your CV",
    ],
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
    sections: [
      {
        body: "Almost every first-time job seeker accepts the first offer they receive because they are afraid of seeming greedy or losing the offer entirely. Here is the truth: companies expect negotiation. Hiring managers have a range, not a fixed number. The offer they give you is rarely the top of that range.",
      },
      {
        heading: "Do Your Research First",
        body: "Never negotiate without data. Know your number before the call.",
        bullets: [
          "Check Glassdoor, Levels.fyi, and LinkedIn Salary for your role, location, and company size",
          "Ask people in the same role in online communities (r/cscareerquestions, Tech Workers UK Discord)",
          "Factor in the full package — base salary, bonus, equity, pension contribution, and benefits",
          "Know your target number and your walk-away number before the conversation begins",
        ],
      },
      {
        heading: "When They Give You the Offer",
        body: "Do not accept or negotiate on the spot. This is your first move.",
        tip: "Say exactly this: 'Thank you so much — I'm really excited about this opportunity. Could I have until [2 days from now] to review the full details?' This buys you time and signals professionalism, not hesitation.",
      },
      {
        heading: "The Negotiation Script",
        body: "When you call back, here is a word-for-word framework that works:",
        numbered: [
          "'I've done some research on the market rate for this role, and based on my skills in [X and Y], I was hoping for something closer to [your number].'",
          "Then stop talking. Silence is powerful. Let them respond.",
          "If they push back, say: 'I understand — is there flexibility on [bonus / start date / remote days]?' — showing you are open to the full package, not just base.",
          "If they say the offer is final: 'I appreciate the transparency. Can I have 24 hours to make my decision?' — then decide based on your walk-away number.",
        ],
        warning: "Never give a number first if you can avoid it. If they ask 'what are you expecting?', say: 'I'd love to hear what you have in mind — I'm flexible and focused on finding the right fit.'",
      },
      {
        heading: "What You Can Negotiate Beyond Salary",
        bullets: [
          "Start date — more time before starting = more rest or wrapping up commitments",
          "Remote or hybrid flexibility — especially valuable for commuting costs",
          "One-time signing bonus — easier for companies to approve than a salary increase",
          "Professional development budget — courses, conferences, certifications",
          "Extra holiday days — often overlooked but very valuable",
        ],
      },
    ],
    keyTakeaways: [
      "Negotiation is expected — you will not lose the offer for asking",
      "Research your market rate before any conversation",
      "Always ask for time before responding to an offer",
      "Silence after making your ask is powerful — do not fill it",
      "Salary is not the only thing negotiable — think about the full package",
    ],
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
    sections: [
      {
        body: "The best developers are not necessarily the ones who write the cleanest code. They are the ones who understand requirements before building, communicate blockers early, and make the people around them better. These five skills are what separate a good hire from a great one.",
      },
      {
        heading: "1. Clear Written Communication",
        body: "Most developer work happens asynchronously — in pull requests, Slack threads, Jira comments, and documentation. The ability to explain your thinking clearly in writing is one of the highest-leverage skills you can build.",
        bullets: [
          "Write PR descriptions that explain why you made a change, not just what it does",
          "When you are blocked, write a clear message: what you tried, what happened, what you need",
          "Document decisions in tickets or wikis so future teammates understand the context",
        ],
        tip: "Treat every written message as a first draft — read it once before sending and ask: 'Does someone who wasn't in this conversation understand what I'm asking?'",
      },
      {
        heading: "2. Asking Good Questions",
        body: "Junior developers often ask vague questions or avoid asking altogether. Senior developers ask precise questions early, before building the wrong thing.",
        bullets: [
          "Before asking for help, state what you have already tried",
          "When given a task, ask 'what does done look like?' and 'what are the edge cases I should know about?'",
          "Clarify requirements in writing so there is a shared record",
        ],
      },
      {
        heading: "3. Managing Up",
        body: "Managing up means keeping your manager informed without them having to chase you. This builds trust faster than almost anything else.",
        numbered: [
          "Send a short weekly update on what you completed, what you are working on, and any blockers",
          "Flag risks early — a heads-up about a delay is far better than a surprise",
          "When you disagree with a decision, share your concern once clearly, then commit to the decision if the team proceeds",
        ],
      },
      {
        heading: "4. Receiving Feedback Well",
        body: "Code review is a core part of developer work. How you receive feedback — especially critical feedback — shapes how much others invest in your growth.",
        bullets: [
          "Assume positive intent — most code review feedback is about the code, not you",
          "Ask 'what would you do differently?' when feedback is vague",
          "Say thank you, even for hard feedback",
          "Follow up after implementing suggestions to close the loop",
        ],
        warning: "Getting defensive about your code is the fastest way to stop receiving useful feedback. The team will start approving your PRs without comment — which feels easier but teaches you nothing.",
      },
      {
        heading: "5. Reliably Doing What You Say You Will Do",
        body: "The simplest soft skill is also the rarest: follow-through. If you say you will have something done by Thursday, have it done by Thursday. If you cannot, communicate early.",
        bullets: [
          "Under-promise and over-deliver, especially early in a role",
          "If a task takes longer than expected, flag it the moment you know — not when the deadline passes",
          "Build a reputation as someone who can be trusted with important work",
        ],
      },
    ],
    keyTakeaways: [
      "Clear written communication is one of the highest-leverage skills in remote and hybrid teams",
      "Ask precise questions early — it saves more time than it uses",
      "Keep your manager informed without being asked",
      "Receive feedback without defensiveness — it is about the code, not you",
      "Follow-through is rare and builds trust faster than almost anything else",
    ],
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
    sections: [
      {
        body: "Behavioural interview questions are not fluffy — they are one of the most reliable predictors of job performance. Interviewers are not looking for perfect stories. They are looking for evidence of how you think, how you handle difficulty, and how you work with others.",
      },
      {
        heading: "What Is the STAR Method?",
        body: "STAR is a four-part structure for answering behavioural questions. It keeps your answer focused, specific, and easy to follow.",
        numbered: [
          "Situation — Set the scene. Where were you, what was the context, what was at stake?",
          "Task — What was your specific responsibility in that situation?",
          "Action — What did you do? Be specific about your actions, not the team's.",
          "Result — What happened? Use numbers if you can. What did you learn?",
        ],
        tip: "Each answer should take 1.5 to 2.5 minutes — not longer. Practise timing yourself. Rambling is the most common mistake.",
      },
      {
        heading: "The 6 Stories You Must Prepare",
        body: "You can answer most behavioural questions with a bank of 6 well-prepared stories. Choose situations that are rich enough to adapt.",
        numbered: [
          "A project you led or took significant ownership of",
          "A time you failed or made a mistake — and what you did about it",
          "A time you disagreed with a teammate or manager",
          "A time you went above and beyond what was asked of you",
          "A difficult problem you solved with limited resources or time",
          "A time you had to learn something new quickly under pressure",
        ],
        tip: "Use examples from university projects, internships, part-time jobs, or even volunteer work. You do not need a full-time job to have good stories.",
      },
      {
        heading: "Common Questions and How to Answer Them",
        bullets: [
          "'Tell me about yourself' — This is not an invitation to recite your CV. Give a 60-second narrative: where you started, what you have done, and where you want to go.",
          "'Tell me about a challenge you overcame' — Use your difficult problem story. Focus on your specific actions and be honest about what was hard.",
          "'Describe a time you worked in a team' — Pick a story where there was real tension or disagreement, not just smooth sailing. Resolution matters.",
          "'What is your greatest weakness?' — Name a real weakness, describe what it has cost you, and explain what you are doing about it. Generic answers like 'I work too hard' are seen through immediately.",
        ],
      },
      {
        heading: "Practice Out Loud",
        body: "Reading your STAR stories in your head is not practice. You need to say them out loud — preferably to another person or recorded on your phone.",
        bullets: [
          "Use Pramp or Big Interview for structured practice with feedback",
          "Ask a friend or classmate to ask you questions and give a 5-minute debrief",
          "Record a voice memo and listen back — you will immediately notice where you ramble",
          "Aim to answer each question at least 5 times before the interview",
        ],
        warning: "Memorised answers sound memorised. Learn the structure and key details of each story, but let the words change each time. Authenticity matters.",
      },
    ],
    keyTakeaways: [
      "STAR keeps answers focused — Situation, Task, Action, Result",
      "Prepare 6 core stories that can flex to answer most questions",
      "Each answer should be 1.5 to 2.5 minutes — practise the timing",
      "Practice out loud, not just in your head",
      "Honest stories with real difficulty beat polished, generic answers every time",
    ],
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
    sections: [
      {
        body: "The tech industry is one of the few sectors where your previous career is often an advantage, not baggage. A teacher who codes brings pedagogical thinking. A marketer who codes understands customers. A finance professional who automates workflows understands risk. Your background is a differentiator — use it.",
      },
      {
        heading: "Step 1 — Pick an Entry Point That Matches Your Background",
        body: "Not all tech roles require writing code. Start with the path of least resistance, then expand.",
        bullets: [
          "Software Engineering — requires the most learning, but the widest availability of roles",
          "Product Management — ideal for people with business, psychology, or project management backgrounds",
          "Data Analysis — great for finance, science, or research backgrounds; SQL and Excel are the entry point",
          "UX Design — strong fit for teachers, marketers, and social scientists; empathy and research skills transfer directly",
          "QA Engineering — often underrated, easier to enter, pays well, and leads to developer roles",
          "Technical Writing — ideal for writers; requires learning tech concepts, not how to build them",
        ],
      },
      {
        heading: "Step 2 — Build Targeted Skills",
        body: "Once you have chosen a direction, build only the skills you need for that path. Many career switchers waste time learning things that are irrelevant for their chosen entry point.",
        numbered: [
          "Software Engineering: Start with Python or JavaScript. Build 3 projects. Take a structured course (CS50, The Odin Project) before paid bootcamps.",
          "Product Management: No coding required. Learn Figma basics, study Agile/Scrum, read 'Inspired' by Marty Cagan, and practice writing PRDs.",
          "Data Analysis: Learn SQL (Mode Analytics free course), Excel or Google Sheets, and basic Python with pandas.",
          "UX Design: Learn Figma, study Nielsen Norman Group's free articles, and build a portfolio of redesign case studies.",
        ],
        tip: "Give yourself 6–12 months of focused learning before applying. Rushing into a job market without enough skills leads to rejections that erode confidence.",
      },
      {
        heading: "Step 3 — Leverage Your Previous Career",
        bullets: [
          "Apply to tech companies in your previous industry first — a teacher applying to EdTech has domain knowledge that a fresh CS graduate does not",
          "Frame your past experience in terms of outcomes — 'managed a team of 12' and 'reduced process time by 30%' translate directly to tech environments",
          "Reach out to career switchers who made the same transition on LinkedIn — they will help and they remember how it felt",
        ],
        warning: "Do not hide your previous career on your CV. It makes you interesting. Lead with it, then show how your new skills add to it.",
      },
      {
        heading: "Common Mistakes to Avoid",
        bullets: [
          "Spending months on courses without building anything — learning stalls without application",
          "Targeting FAANG before building experience — start at a startup or mid-size company first",
          "Waiting until you feel 'ready' — you will never feel fully ready; apply when you are 70% ready",
          "Ignoring your network — most tech jobs, especially junior ones at smaller companies, are filled through referrals",
        ],
      },
    ],
    keyTakeaways: [
      "Your previous career is an advantage — use it to target companies in familiar industries",
      "Choose an entry point that matches your existing strengths, not just the highest-paying path",
      "Build skills in a focused, targeted way — avoid learning everything",
      "Apply when you are 70% ready — the remaining 30% comes from doing the job",
      "Connect with career switchers who made the same transition — they are the most useful community",
    ],
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
    sections: [
      {
        body: "The internet has made it easier than ever to start learning to code — and harder than ever to finish. There are too many resources, too many opinions on which language to learn first, and too many people who quit after the first wall of confusion. The problem is rarely the content. It is the learning strategy.",
      },
      {
        heading: "1. Pick One Resource and Finish It",
        body: "Switching between courses is the most common cause of slow progress. Every new resource starts with the basics, so you feel like you are learning, but you never go deep.",
        bullets: [
          "For web development: The Odin Project (free, project-based, excellent)",
          "For Python: CS50P from Harvard (free, beginner-friendly)",
          "For CS fundamentals: CS50x from Harvard (free, comprehensive)",
        ],
        tip: "Choose one resource before reading any more 'what should I learn first' articles. The resource matters far less than the consistency with which you use it.",
      },
      {
        heading: "2. Build Things Before You Feel Ready",
        body: "Tutorial hell is real. You can watch coding videos indefinitely and still not be able to build anything from scratch. The fix is to build projects that are slightly beyond your current ability — this is called the zone of proximal development.",
        numbered: [
          "After each tutorial section, close it and try to recreate what you just built from memory",
          "When you get stuck, sit with the problem for 20 minutes before looking at a solution",
          "Modify the tutorial project before moving on — change the colours, add a feature, break something and fix it",
        ],
      },
      {
        heading: "3. Space Your Learning to Retain More",
        body: "Cramming eight hours on a Saturday and doing nothing the rest of the week is far less effective than coding for one hour every day.",
        bullets: [
          "Aim for 5–7 days per week of coding, even if some sessions are only 20 minutes",
          "Use spaced repetition (Anki) for syntax and commands you keep forgetting",
          "Before each session, spend 5 minutes reviewing what you did the day before",
        ],
        tip: "Consistency over intensity. A developer who codes for an hour every day for a year vastly outperforms one who does 10-hour weekend sprints.",
      },
      {
        heading: "4. Embrace Being Confused",
        body: "Confusion is not a sign that you are doing it wrong. It is the feeling of your brain building new pathways. Most beginners quit when they hit confusion because they interpret it as a ceiling.",
        bullets: [
          "Set a 20-minute timer when you are stuck — try everything you can think of",
          "After 20 minutes, look at resources — Stack Overflow, documentation, forums",
          "After another 20 minutes, ask for help — but explain what you tried first",
        ],
        warning: "Googling immediately when you are stuck prevents learning. The struggle is where the understanding forms. Tolerate discomfort for at least 20 minutes first.",
      },
      {
        heading: "5. Build in Public",
        body: "Sharing your learning publicly creates accountability, opens doors to community, and builds a portfolio before you even realise it.",
        bullets: [
          "Post weekly updates on LinkedIn or Twitter about what you are building",
          "Join a Discord community for your learning path and ask questions there",
          "Pair with another beginner — explaining concepts to someone else is the fastest way to find gaps in your own understanding",
        ],
      },
    ],
    keyTakeaways: [
      "Pick one learning resource and finish it — course-switching creates the illusion of progress",
      "Build projects slightly beyond your ability — that is where learning accelerates",
      "Daily practice beats weekend sprints — consistency is the advantage",
      "Confusion is part of the process, not a sign of failure",
      "Build in public — the accountability and community are worth it",
    ],
  },
];

// ─── Supporting data ─────────────────────────────────────────────────────────

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "All Levels": "bg-primary/10 text-primary border-primary/20",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Callout = ({
  type,
  text,
}: {
  type: "tip" | "warning";
  text: string;
}) => {
  if (type === "tip") {
    return (
      <div className="my-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
      </div>
    );
  }
  return (
    <div className="my-5 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const CareerTipDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const article = articles.find((a) => a.id === id);

  // Graceful 404 within layout
  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Article not found
          </h1>
          <p className="text-muted-foreground mb-6">
            This article does not exist or may have been moved.
          </p>
          <Button asChild>
            <Link to="/career-tips">Browse all tips</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const Icon = article.icon;

  // Suggest up to 3 related articles (same category first, then others)
  const related = articles
    .filter((a) => a.id !== article.id)
    .sort((a, b) =>
      a.category === article.category
        ? -1
        : b.category === article.category
        ? 1
        : 0
    )
    .slice(0, 3);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back link */}
        <Link
          to="/career-tips"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Career Tips
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 items-start">
          {/* ── Article body ─────────────────────────────────────── */}
          <article>
            {/* Header */}
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  {article.category}
                </Badge>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${levelColors[article.level]}`}
                >
                  {article.level}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
                {article.title}
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-5">
                {article.excerpt}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {article.readTime}
                </div>
                <span>{article.date}</span>
              </div>
            </header>

            {/* Sections */}
            <div className="prose prose-sm md:prose-base max-w-none">
              {article.sections.map((section, i) => (
                <div key={i} className="mb-7">
                  {section.heading && (
                    <h2 className="text-lg md:text-xl font-bold text-foreground mb-3 mt-8 first:mt-0">
                      {section.heading}
                    </h2>
                  )}
                  {section.body && (
                    <p className="text-foreground leading-relaxed mb-3 text-sm md:text-base">
                      {section.body}
                    </p>
                  )}
                  {section.tip && <Callout type="tip" text={section.tip} />}
                  {section.warning && (
                    <Callout type="warning" text={section.warning} />
                  )}
                  {section.bullets && (
                    <ul className="space-y-2 my-3">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex gap-3 text-sm md:text-base text-foreground leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.numbered && (
                    <ol className="space-y-3 my-3">
                      {section.numbered.map((n, j) => (
                        <li key={j} className="flex gap-3 text-sm md:text-base text-foreground leading-relaxed">
                          <span className="shrink-0 font-bold text-primary text-sm mt-0.5 w-5 text-right">
                            {j + 1}.
                          </span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>

            {/* Key Takeaways */}
            <div className="mt-10 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Key takeaways
              </h2>
              <ul className="space-y-3">
                {article.keyTakeaways.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Ready to practise?
              </h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Put these tips into action with Alex, your AI interview coach.
                Get real-time feedback on every answer.
              </p>
              <Button asChild>
                <Link to="/signup">
                  Start AI Interview Practice
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </article>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <aside className="hidden lg:block sticky top-8 space-y-6">
            {/* Article meta card */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  About this article
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium text-foreground">{article.category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Level</dt>
                    <dd className="font-medium text-foreground">{article.level}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Read time</dt>
                    <dd className="font-medium text-foreground">{article.readTime}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Published</dt>
                    <dd className="font-medium text-foreground">{article.date}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Related articles */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 px-1">
                Related articles
              </h3>
              <div className="space-y-3">
                {related.map((r) => {
                  const RIcon = r.icon;
                  return (
                    <Link
                      key={r.id}
                      to={`/career-tips/${r.id}`}
                      className="group flex gap-3 items-start p-3 rounded-xl border border-border hover:border-primary/40 bg-card hover:bg-muted/30 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <RIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {r.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.readTime}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link
                to="/career-tips"
                className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline px-1"
              >
                View all tips
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default CareerTipDetail;