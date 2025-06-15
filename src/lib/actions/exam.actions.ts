"use server";

import { z } from "zod";
import { placeholderExams, addExam as addPlaceholderExam, findExamById as findPlaceholderExamById } from "@/lib/placeholder-data";
import type { Exam, Question, QuestionOption } from "@/lib/types";

const questionOptionSchema = z.object({
  id: z.string().optional(), // Optional for new options
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
  id: z.string().optional(), // Optional for new questions
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["multiple-choice", "short-answer", "essay"]),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  points: z.coerce.number().min(0, "Points must be a positive number"),
});

const createExamSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters"),
  questions: z.array(questionSchema).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().optional(),
});

export async function createExamAction(values: z.infer<typeof createExamSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const parsed = createExamSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: "Invalid exam data. " + parsed.error.flatten().fieldErrors };
  }
  
  const newExamData = {
    ...parsed.data,
    questions: parsed.data.questions.map(q => ({
      ...q,
      id: q.id || Math.random().toString(36).substr(2, 9), // Ensure ID
      options: q.options?.map(opt => ({...opt, id: opt.id || Math.random().toString(36).substr(2, 9)}))
    }))
  } as Omit<Exam, 'id' | 'createdAt' | 'setterId'>;


  try {
    const createdExam = addPlaceholderExam(newExamData);
    return { success: true, message: "Exam created successfully!", exam: createdExam };
  } catch (error) {
    console.error("Error creating exam:", error);
    return { success: false, message: "Failed to create exam." };
  }
}

export async function listExamsAction(): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    // In a real app, this would fetch from the database
    return { success: true, exams: placeholderExams };
  } catch (error) {
    console.error("Error listing exams:", error);
    return { success: false, message: "Failed to load exams." };
  }
}

export async function getExamByIdAction(id: string): Promise<{ success: boolean; exam?: Exam; message?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const exam = findPlaceholderExamById(id);
    if (exam) {
      return { success: true, exam };
    }
    return { success: false, message: "Exam not found." };
  } catch (error) {
    console.error("Error fetching exam:", error);
    return { success: false, message: "Failed to load exam details." };
  }
}

export async function verifyPasscodeAction(examId: string, passcode: string): Promise<{ success: boolean; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const exam = findPlaceholderExamById(examId);
  if (!exam) {
    return { success: false, message: "Exam not found." };
  }
  if (exam.passcode === passcode) {
    return { success: true };
  }
  return { success: false, message: "Incorrect passcode." };
}

const submitExamSchema = z.object({
  examId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
  })),
});

export async function submitExamAnswersAction(values: z.infer<typeof submitExamSchema>): Promise<{ success: boolean; message: string; submissionId?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Mock submission handling
  console.log("Exam submitted:", values);
  // In a real app, save answers to DB, calculate score, etc.
  const submissionId = Math.random().toString(36).substr(2, 9);
  return { success: true, message: "Exam submitted successfully!", submissionId };
}
