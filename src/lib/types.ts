export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[]; // For multiple choice
  correctAnswer?: string; // For MC (option id) or short answer text
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string; // Prisma model has String? - ensure it's always string here or handle undefined
  passcode: string;
  questions: Question[];
  setterId: string; 
  createdAt: Date;
  durationMinutes?: number;
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[]; // string for short-answer/essay/MCQ_option_id, string[] for future multi-select MCQs
}

export interface UserSubmission {
  id: string;
  examId: string;
  takerId: string;
  answers: UserAnswer[];
  submittedAt: Date;
  score?: number;
}
