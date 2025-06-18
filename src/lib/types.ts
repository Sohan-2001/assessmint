
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

// Define Role enum locally as Prisma is removed
export enum Role {
  SETTER = 'SETTER',
  TAKER = 'TAKER',
}

export interface QuestionOption {
  id: string;
  text: string;
  questionId?: string; // Keep if useful for frontend, but populated from join
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string;
  points: number;
  examId?: string; // Keep if useful for frontend
  // Fields for evaluation UI, not directly from DB model but useful in components
  userAnswer?: string | string[];
  awardedMarks?: number | null;
  feedback?: string | null;
  createdAt?: Date; // Added for consistency if needed
  updatedAt?: Date; // Added for consistency if needed
}

export interface Exam {
  id:string;
  title: string;
  description: string;
  passcode: string;
  questions: Question[];
  setterId: string;
  createdAt: Date;
  updatedAt?: Date; // Added for consistency
  durationMinutes?: number;
  openAt?: Date;
}

export interface UserAnswer {
  id?: string; // Optional if not always fetched/needed on client
  questionId: string;
  answer: string | string[];
  awardedMarks?: number | null;
  feedback?: string | null;
  submissionId?: string; // Optional
}

export interface UserSubmission {
  id: string;
  examId: string;
  takerId: string;
  answers: UserAnswer[];
  submittedAt: Date;
  score?: number;
  evaluatedScore?: number | null;
  isEvaluated?: boolean;
  createdAt?: Date; // Added for consistency
  updatedAt?: Date; // Added for consistency
}


// Type specifically for listing submissions for evaluation
export interface SubmissionInfo {
  submissionId: string;
  takerId: string;
  email: string; // Assumes User table has email
  submittedAt: Date;
  isEvaluated: boolean;
  evaluatedScore?: number | null;
}

// Type for displaying detailed submission with exam questions for evaluation
export interface SubmissionForEvaluation {
    submissionId: string;
    takerEmail: string; // Assumes User table has email
    examTitle: string;
    examId: string;
    questions: Array<Question & {
        userAnswer?: string | string[];
        awardedMarks?: number | null;
        feedback?: string | null;
    }>;
    isEvaluated: boolean;
    evaluatedScore?: number | null;
}
