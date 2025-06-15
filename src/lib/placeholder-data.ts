import type { Exam, Question, QuestionOption } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const sampleMcqOptions: QuestionOption[] = [
  { id: generateId(), text: 'Option A' },
  { id: generateId(), text: 'Option B' },
  { id: generateId(), text: 'Option C' },
  { id: generateId(), text: 'Option D' },
];

export const placeholderQuestions: Question[] = [
  {
    id: generateId(),
    text: 'What is the capital of France?',
    type: 'multiple-choice',
    options: [
      { id: 'opt_paris', text: 'Paris' },
      { id: 'opt_london', text: 'London' },
      { id: 'opt_berlin', text: 'Berlin' },
      { id: 'opt_madrid', text: 'Madrid' },
    ],
    correctAnswer: 'opt_paris',
    points: 10,
  },
  {
    id: generateId(),
    text: 'Explain the concept of photosynthesis in a few sentences.',
    type: 'short-answer',
    correctAnswer: 'Photosynthesis is the process used by plants, algae and certain bacteria to harness energy from sunlight and turn it into chemical energy.',
    points: 15,
  },
  {
    id: generateId(),
    text: 'Write an essay on the impact of climate change.',
    type: 'essay',
    points: 25,
  },
  {
    id: generateId(),
    text: 'What is 2 + 2?',
    type: 'multiple-choice',
    options: [
        { id: 'opt_2_1', text: '3' },
        { id: 'opt_2_2', text: '4' },
        { id: 'opt_2_3', text: '5' },
        { id: 'opt_2_4', text: '6' },
    ],
    correctAnswer: 'opt_2_2',
    points: 5,
  }
];

export let placeholderExams: Exam[] = [
  {
    id: 'exam_1',
    title: 'General Knowledge Quiz',
    description: 'A fun quiz to test your general knowledge.',
    passcode: '1234',
    questions: placeholderQuestions.slice(0, 2),
    setterId: 'setter_1',
    createdAt: new Date('2023-10-01T10:00:00Z'),
    durationMinutes: 30,
  },
  {
    id: 'exam_2',
    title: 'Science Fundamentals',
    description: 'Basic concepts in science.',
    passcode: '5678',
    questions: placeholderQuestions.slice(1,3),
    setterId: 'setter_1',
    createdAt: new Date('2023-10-05T14:30:00Z'),
    durationMinutes: 45,
  },
  {
    id: 'exam_3',
    title: 'Advanced Mathematics Test',
    description: 'Challenging math problems for advanced students.',
    passcode: '0000',
    questions: [placeholderQuestions[3]],
    setterId: 'setter_2',
    createdAt: new Date('2023-10-10T09:00:00Z')
  }
];

// Function to add a new exam (for mocking exam creation)
export const addExam = (exam: Omit<Exam, 'id' | 'createdAt' | 'setterId'>): Exam => {
  const newExam: Exam = {
    ...exam,
    id: generateId(),
    createdAt: new Date(),
    setterId: 'current_setter_mock_id', // Replace with actual setter ID in a real app
  };
  placeholderExams.push(newExam);
  return newExam;
};

// Function to find an exam by ID
export const findExamById = (id: string): Exam | undefined => {
  return placeholderExams.find(exam => exam.id === id);
};
