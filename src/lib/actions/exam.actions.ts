"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Exam as PrismaExam, Question as PrismaQuestion, QuestionOption as PrismaQuestionOption, QuestionType as PrismaQuestionType } from "@prisma/client";
import type { Exam, Question, QuestionOption } from "@/lib/types"; // Keep our frontend types for now

// Zod schema for question options, aligning with Prisma model (ID is optional for creation)
const questionOptionSchemaClient = z.object({
  id: z.string().optional(), // Client might generate IDs for new options
  text: z.string().min(1, "Option text cannot be empty"),
});

// Zod schema for questions, aligning with Prisma model
const questionSchemaClient = z.object({
  id: z.string().optional(), // Client might generate IDs for new questions
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]), // Use uppercase to match Prisma/types.ts
  options: z.array(questionOptionSchemaClient).optional(),
  correctAnswer: z.string().optional(), // For MCQs, this will be option text or ID. For SA, the answer.
  points: z.coerce.number().min(0, "Points must be a non-negative number"),
});

// Zod schema for creating an exam
const createExamSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters"),
  questions: z.array(questionSchemaClient).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional(),
});


// Helper to map Prisma Exam to our frontend Exam type
function mapPrismaExamToAppExam(prismaExam: PrismaExam & { questions: (PrismaQuestion & { options: PrismaQuestionOption[] })[] }): Exam {
  return {
    ...prismaExam,
    description: prismaExam.description ?? "", // Ensure description is string
    questions: prismaExam.questions.map(q => ({
      ...q,
      type: q.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY', // Cast from Prisma enum
      options: q.options.map(opt => ({ ...opt })),
      correctAnswer: q.correctAnswer ?? undefined,
    })),
    createdAt: new Date(prismaExam.createdAt), // Ensure Date object
  };
}


export async function createExamAction(values: z.infer<typeof createExamSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  const parsed = createExamSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors:", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  
  // Mock setter ID - in a real app, this would come from the authenticated user's session/context
  const mockSetterId = "clmocksetterid123"; 
  // Ensure a user with this ID exists or handle user creation/linking appropriately.
  // For this example, we assume a mock user with this ID might exist or the schema handles it.
  // If this user doesn't exist, Prisma will throw a foreign key constraint error unless handled.
  // One way to handle this is to create a mock user if not found, for dev purposes.
  await prisma.user.upsert({
    where: { id: mockSetterId },
    update: {},
    create: { id: mockSetterId, email: `setter-${mockSetterId}@example.com`, password: "mockpassword", role: "SETTER" },
  });


  try {
    const createdExamFromDb = await prisma.exam.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        passcode: parsed.data.passcode,
        durationMinutes: parsed.data.durationMinutes,
        setterId: mockSetterId, 
        questions: {
          create: parsed.data.questions.map(q_client => {
            let correctAnswerForDb: string | undefined = q_client.correctAnswer;
            if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
              // Assuming q_client.correctAnswer is the TEXT of the correct option from the form
              // And q_client.options have client-generated IDs that we want to persist.
              const correctOpt = q_client.options.find(opt => opt.text === q_client.correctAnswer);
              correctAnswerForDb = correctOpt ? correctOpt.id : undefined; 
              // If correctOpt.id is undefined here, it means client didn't send ID, or text match failed.
              // Prisma will auto-generate IDs for options if not provided.
              // This logic might need refinement based on how IDs are handled client-side for options.
              // For now, if `correctOpt.id` is undefined, it means we are relying on Prisma to generate option IDs,
              // and we cannot link `correctAnswer` to an option ID in this single nested write.
              // A safer approach is for the client to ALWAYS send an ID for the chosen correct option.
              // Or, if `q_client.correctAnswer` is the *ID* from client:
              // correctAnswerForDb = q_client.correctAnswer; (if client sends correct option's ID)
            }

            return {
              id: q_client.id, // Use client-provided ID if available
              text: q_client.text,
              type: q_client.type as PrismaQuestionType,
              points: q_client.points,
              correctAnswer: correctAnswerForDb, // This should be the ID of the correct option for MCQ
              options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                create: q_client.options.map(opt_client => ({
                  id: opt_client.id, // Use client-provided ID if available for options
                  text: opt_client.text,
                }))
              } : undefined,
            };
          }),
        },
      },
      include: {
        questions: { include: { options: true } },
      },
    });
    
    const appExam = mapPrismaExamToAppExam(createdExamFromDb);
    return { success: true, message: "Exam created successfully!", exam: appExam };

  } catch (error) {
    console.error("Error creating exam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to create exam. ${errorMessage}` };
  }
}

export async function listExamsAction(): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examsFromDb = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { // Fetch questions to determine questions.length
          select: { id: true } // Only need id to count or for minimal data
        }
      }
    });

    const appExams: Exam[] = examsFromDb.map(exam => ({
      ...exam,
      description: exam.description ?? "",
      questions: exam.questions.map(q => ({ // Map to Question stub for length
          id: q.id, 
          text: '', type: 'SHORT_ANSWER', points: 0 // Dummy values, only length is used by ExamCard
      })) as Question[], 
      createdAt: new Date(exam.createdAt),
    }));
    return { success: true, exams: appExams };
  } catch (error) {
    console.error("Error listing exams:", error);
    return { success: false, message: "Failed to load exams." };
  }
}

export async function getExamByIdAction(id: string): Promise<{ success: boolean; exam?: Exam; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examFromDb = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }, // Or some other consistent order
          include: {
            options: { orderBy: { createdAt: 'asc' } }, // Consistent order for options
          },
        },
      },
    });

    if (examFromDb) {
      const appExam = mapPrismaExamToAppExam(examFromDb);
      return { success: true, exam: appExam };
    }
    return { success: false, message: "Exam not found." };
  } catch (error)    {
    console.error("Error fetching exam by ID:", error);
    return { success: false, message: "Failed to load exam details." };
  }
}

export async function verifyPasscodeAction(examId: string, passcode: string): Promise<{ success: boolean; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { passcode: true },
    });

    if (!exam) {
      return { success: false, message: "Exam not found." };
    }
    if (exam.passcode === passcode) {
      return { success: true };
    }
    return { success: false, message: "Incorrect passcode." };
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return { success: false, message: "Error during passcode verification." };
  }
}

const submitExamSchema = z.object({
  examId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    // Answer can be string (for option ID in MC, or text for SA/Essay)
    // Or string array if MC allows multiple selections (not current design but for flexibility)
    answer: z.union([z.string(), z.array(z.string())]), 
  })),
});

export async function submitExamAnswersAction(values: z.infer<typeof submitExamSchema>): Promise<{ success: boolean; message: string; submissionId?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const parsed = submitExamSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: "Invalid submission data." };
  }

  // Mock taker ID
  const mockTakerId = "clmocktakerid123";
  // Ensure a user with this ID exists
  await prisma.user.upsert({
    where: { id: mockTakerId },
    update: {},
    create: { id: mockTakerId, email: `taker-${mockTakerId}@example.com`, password: "mockpassword", role: "TAKER" },
  });
  
  try {
    const submission = await prisma.userSubmission.create({
      data: {
        examId: parsed.data.examId,
        takerId: mockTakerId, 
        // submittedAt is defaulted by Prisma
        answers: {
          create: parsed.data.answers.map(ans => ({
            questionId: ans.questionId,
            answer: ans.answer, // Prisma's Json type will handle string or string[]
          })),
        },
      },
    });
    return { success: true, message: "Exam submitted successfully!", submissionId: submission.id };
  } catch (error) {
    console.error("Error submitting exam answers:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to submit exam. ${errorMessage}` };
  }
}
