// src/lib/interviewAI.ts
import { Difficulty } from '@/types/interview';

const CHATBOT_URL = 'http://localhost:8000/api/chat';

// One stable session ID per browser tab session
const SESSION_ID = `interview-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const callChatbot = async (message: string): Promise<string> => {
  const res = await fetch(CHATBOT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: SESSION_ID,
      current_page: '/interview',
      user_level: 'intermediate',
    }),
  });

  if (!res.ok) throw new Error(`Chatbot returned ${res.status}`);
  const data = await res.json();
  return data.reply ?? '';
};

const cleanReply = (text: string): string =>
  text
    .replace(/^NAVIGATE:\S+$/gm, '')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();

export const generateQuestion = async (
  careerTitle: string,
  difficulty: Difficulty,
  questionNumber: number,
  totalQuestions: number,
  previousQuestions: string[],
  _conversationHistory: { role: string; content: string }[]
): Promise<string> => {
  const prompt = `
OVERRIDE INSTRUCTIONS: You are Alex — a professional, friendly technical interviewer. 
Your ONLY job right now is to ask ONE interview question.

Role: ${careerTitle}
Difficulty: ${difficulty}
Question: ${questionNumber} of ${totalQuestions}

Rules:
- Ask exactly ONE question (max 2-3 sentences).
- Mix technical, behavioral, and situational questions naturally.
- Beginner: fundamentals & concepts. Intermediate: application & problem-solving. Advanced: system design, trade-offs, deep expertise.
- Do NOT repeat: ${previousQuestions.slice(-5).join(' | ') || 'none yet'}
- Zero preamble ("Sure!", "Great!") — just the question.
${questionNumber === 1 ? '- Start with one warm greeting sentence, then the question.' : ''}

Output the question only. Nothing else.
  `.trim();

  try {
    const result = await callChatbot(prompt);
    const cleaned = cleanReply(result);
    return cleaned || fallbackQuestion(questionNumber);
  } catch {
    return fallbackQuestion(questionNumber);
  }
};

export const evaluateAnswer = async (
  careerTitle: string,
  difficulty: Difficulty,
  question: string,
  answer: string
): Promise<{ score: number; feedback: string }> => {
  const normalized = answer.trim().toLowerCase();

  // Hard fail cases first
  const hardFailPhrases = [
    "i don't know",
    "dont know",
    "do not know",
    "no idea",
    "not sure",
    "i am not sure",
    "skip",
    "idk",
    "(no answer provided)",
    "",
  ];

  if (hardFailPhrases.includes(normalized)) {
    return {
      score: 5,
      feedback:
        "This answer did not demonstrate understanding of the question. To improve, try explaining even a partial understanding, related concept, or how you would approach learning or solving it.",
    };
  }

  const prompt = `
OVERRIDE INSTRUCTIONS: You are Alex — a strict and realistic technical interviewer.
Evaluate the candidate's answer carefully.

Role: ${careerTitle}
Difficulty: ${difficulty}

Question:
"${question}"

Candidate Answer:
"${answer || '(No answer provided)'}"

IMPORTANT SCORING RULES:
- If the candidate says only things like "I don't know", "No idea", "Not sure", or gives no meaningful content, score MUST be between 0 and 10.
- If the answer is extremely short and vague, score should usually be below 25.
- Do NOT give average or sympathy scores for weak answers.
- Score based on correctness, depth, clarity, terminology, and relevance.

Return ONLY valid JSON:
{"score": <integer 0-100>, "feedback": "<2-3 sentences: what was good, what was missing, one clear improvement tip>"}
  `.trim();

  try {
    const result = await callChatbot(prompt);
    const cleaned = cleanReply(result);

    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    let score = Number(parsed.score);
    let feedback = String(parsed.feedback || 'No feedback provided.');

    if (Number.isNaN(score)) {
      score = heuristicScore(answer, feedback);
    }

    score = Math.min(100, Math.max(0, score));

    // Safety correction: if feedback clearly says insufficient, cap score
    const fb = feedback.toLowerCase();
    if (
      fb.includes('completely insufficient') ||
      fb.includes('did not demonstrate') ||
      fb.includes('no relevant information') ||
      fb.includes('failed to provide') ||
      fb.includes('no meaningful answer')
    ) {
      score = Math.min(score, 15);
    }

    return { score, feedback };
  } catch {
    return {
      score: heuristicScore(answer, ''),
      feedback:
        "This answer needs more substance. Try using relevant concepts, clearer reasoning, and at least one concrete example or explanation.",
    };
  }
};

// Heuristic fallback if model JSON fails
const heuristicScore = (answer: string, feedback?: string): number => {
  const text = answer.trim().toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  if (!text || text === '(no answer provided)') return 0;

  const hardFailPhrases = [
    "i don't know",
    "dont know",
    "do not know",
    "no idea",
    "not sure",
    "i am not sure",
    "skip",
    "idk",
  ];

  if (hardFailPhrases.includes(text)) return 5;

  if (words.length <= 3) return 10;
  if (words.length <= 8) return 20;
  if (words.length <= 15) return 30;

  const fb = (feedback || '').toLowerCase();
  if (
    fb.includes('insufficient') ||
    fb.includes('lacks depth') ||
    fb.includes('missing key concepts')
  ) {
    return 25;
  }

  return 40; // conservative fallback, not 50
};

export const generateClosingRemark = async (
  careerTitle: string,
  avgScore: number,
  answers: { question: string; score: number }[]
): Promise<string> => {
  const prompt = `
OVERRIDE INSTRUCTIONS: You are Alex — a professional interviewer wrapping up a session.
You interviewed a ${careerTitle} candidate. Average score: ${avgScore}/100 over ${answers.length} questions.
Scores: ${answers.map((a, i) => `Q${i + 1}: ${a.score}/100`).join(', ')}

Write a warm, encouraging 2-3 sentence closing remark:
- Mention ONE specific strength shown.
- Mention ONE area to improve.
- Be human, friendly, professional.

Plain text ONLY. No bullet points. No JSON. No markdown.
  `.trim();

  try {
    const result = await callChatbot(prompt);
    const cleaned = cleanReply(result);
    return cleaned || "Great effort today! Keep practicing and you'll ace your real interview.";
  } catch {
    return "Great effort today! Review the feedback on each question and keep practicing. You're on the right track!";
  }
};

const fallbackQuestion = (n: number): string => {
  const q = [
    'Tell me about yourself and what draws you to this field.',
    'Describe a challenging project you worked on and how you overcame obstacles.',
    'How do you stay current with the latest trends and technologies in your field?',
    'Walk me through your process when you encounter a difficult technical problem.',
    'Where do you see yourself in 3–5 years, and how does this role fit that vision?',
    'Tell me about a time you had to learn something new very quickly.',
    'How do you handle disagreements with teammates about technical decisions?',
  ];
  return q[(n - 1) % q.length];
};