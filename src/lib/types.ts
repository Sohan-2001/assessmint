
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[]; 
  correctAnswer?: string; 
  points: number;
  // Fields for evaluation UI, not directly from DB model but useful in components
  userAnswer?: string | string[]; 
  awardedMarks?: number | null;
  feedback?: string | null;
}

export interface Exam {
  id: string;
  title: string;
  description: string; 
  passcode: string;
  questions: Question[];
  setterId: string;
  createdAt: Date;
  durationMinutes?: number;
  openAt?: Date; 
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[]; 
  awardedMarks?: number | null; // For storing marks given by setter
  feedback?: string | null; // For storing feedback given by setter
}

export interface UserSubmission {
  id: string;
  examId: string;
  takerId: string;
  answers: UserAnswer[];
  submittedAt: Date;
  score?: number; // Auto-calculated score for MCQs perhaps
  evaluatedScore?: number | null; // Score after manual evaluation
  isEvaluated?: boolean; // Has this submission been manually evaluated
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
    questions: Array<Question & { // Question here includes userAnswer, awardedMarks, feedback for UI
        userAnswer?: string | string[];
        awardedMarks?: number | null; 
        feedback?: string | null;
    }>;
    isEvaluated: boolean;
    evaluatedScore?: number | null;
}
