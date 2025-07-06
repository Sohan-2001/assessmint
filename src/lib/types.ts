
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

// Define Role enum locally
export enum Role {
  SETTER = 'SETTER',
  TAKER = 'TAKER',
}

export interface QuestionOption {
  id: string;
  text: string;
  questionId?: string; 
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  correctAnswer?: string;
  points: number;
  examId?: string; 
  userAnswer?: string | string[];
  awardedMarks?: number | null;
  feedback?: string | null;
  createdAt?: Date; 
  updatedAt?: Date; 
}

export interface Exam {
  id:string;
  title: string;
  description: string;
  passcode: string;
  questions: Question[];
  setterId: string;
  createdAt: Date;
  updatedAt?: Date; 
  durationMinutes?: number;
  openAt?: Date;
  allowedTakerEmails?: string[]; // For displaying if needed, populated from ExamAllowedTaker
}

export interface UserAnswer {
  id?: string; 
  questionId: string;
  answer: string | string[]; // For MCQs, this could be the option ID or array of IDs if multi-select
  awardedMarks?: number | null;
  feedback?: string | null;
  submissionId?: string; 
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date; 
  updatedAt?: Date; 
}


// Type specifically for listing submissions for evaluation
export interface SubmissionInfo {
  submissionId: string;
  takerId: string;
  email: string; 
  submittedAt: Date;
  isEvaluated: boolean;
  evaluatedScore?: number | null;
}

// Type for displaying detailed submission with exam questions for evaluation
export interface SubmissionForEvaluation {
    submissionId: string;
    takerEmail: string; 
    examTitle: string;
    examId: string;
    questions: Array<Question & {
        userAnswer?: string | string[]; // Already in Question, but explicitly part of this structure
        awardedMarks?: number | null; // Already in Question
        feedback?: string | null; // Already in Question
    }>;
    isEvaluated: boolean;
    evaluatedScore?: number | null;
}

// Type for a single record in the taker's exam history
export interface ExamHistoryInfo {
  submissionId: string;
  examId: string;
  examTitle: string;
  submittedAt: Date;
  isEvaluated: boolean;
  evaluatedScore: number | null;
  maxScore: number;
}
