export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type QuestionType = 'technical' | 'behavioral' | 'situational';
export type InterviewMode = 'text' | 'voice';
export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking';

export interface InterviewConfig {
  careerId: string;
  careerTitle: string;
  difficulty: Difficulty;
  questionCount: number;
  mode: InterviewMode;
}

export interface AnswerRecord {
  questionNumber: number;
  question: string;
  answer: string;
  aiFeedback: string;
  score: number;
  timeTaken: number;
}

export interface InterviewSession {
  config: InterviewConfig;
  answers: AnswerRecord[];
  totalScore: number;
  startedAt: string;
}