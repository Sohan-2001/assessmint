export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'short-answer' | 'essay';
  options?: QuestionOption[]; // For multiple choice
  correctAnswer?: string; // For multiple choice (option id) or short answer
  // For essay, grading is manual, so correctAnswer might not apply here.
  points: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  passcode: string;
  questions: Question[];
  setterId: string; // Mocked ID of the exam setter
  createdAt: Date;
  durationMinutes?: number; // Optional: exam duration in minutes
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[]; // string for short-answer/essay, string[] for multiple-choice if multi-select allowed (option ids)
}

export interface UserSubmission {
  id: string;
  examId: string;
  takerId: string; // Mocked ID of the exam taker
  answers: UserAnswer[];
  submittedAt: Date;
  score?: number; // Optional: score after grading
}
