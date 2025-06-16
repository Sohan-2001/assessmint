
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Exam as PrismaExam, Question as PrismaQuestion, QuestionOption as PrismaQuestionOption, QuestionType as PrismaQuestionType } from "@prisma/client";
import type { Exam, Question, QuestionOption } from "@/lib/types"; // Keep our frontend types for now

// Zod schema for question options, aligning with Prisma model (ID is optional for creation/update)
const questionOptionSchemaClient = z.object({
  id: z.string().optional(), 
  text: z.string().min(1, "Option text cannot be empty"),
});

// Zod schema for questions, aligning with Prisma model
const questionSchemaClient = z.object({
  id: z.string().optional(), 
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]), 
  options: z.array(questionOptionSchemaClient).optional(),
  correctAnswer: z.string().optional(), 
  points: z.coerce.number().min(0, "Points must be a non-negative number"),
});

// Zod schema for creating/updating an exam
// For updates, passcode can be optional if not changing.
const examUpsertSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters").optional(), // Optional for update if not changing
  questions: z.array(questionSchemaClient).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
});


// Helper to map Prisma Exam to our frontend Exam type
function mapPrismaExamToAppExam(prismaExam: PrismaExam & { questions: (PrismaQuestion & { options: PrismaQuestionOption[] })[] }): Exam {
  return {
    ...prismaExam,
    description: prismaExam.description ?? "", 
    durationMinutes: prismaExam.durationMinutes ?? undefined,
    questions: prismaExam.questions.map(q => ({
      ...q,
      id: q.id, // Ensure ID is passed through
      type: q.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY', 
      options: q.options.map(opt => ({ ...opt, id: opt.id })), // Ensure option IDs are passed
      correctAnswer: q.correctAnswer ?? undefined,
    })),
    createdAt: new Date(prismaExam.createdAt), 
  };
}


export async function createExamAction(values: z.infer<typeof examUpsertSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  const parsed = examUpsertSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (create):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  if (!parsed.data.passcode) { // Passcode is required for creation
    return { success: false, message: "Passcode is required to create an exam." };
  }
  
  const mockSetterId = "clmocksetterid123"; 
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
        passcode: parsed.data.passcode, // Passcode is asserted non-null by check above
        durationMinutes: parsed.data.durationMinutes,
        setterId: mockSetterId, 
        questions: {
          create: parsed.data.questions.map(q_client => {
            let correctAnswerForDb: string | undefined = q_client.correctAnswer;
            if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
              const correctOptionObject = q_client.options.find(opt => opt.text === q_client.correctAnswer);
              correctAnswerForDb = correctOptionObject ? (correctOptionObject.id || q_client.correctAnswer) : q_client.correctAnswer;
            }
            return {
              id: q_client.id, // Client might suggest an ID, Prisma will use/override
              text: q_client.text,
              type: q_client.type as PrismaQuestionType,
              points: q_client.points,
              correctAnswer: correctAnswerForDb,
              options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                create: q_client.options.map(opt_client => ({
                  id: opt_client.id, // Client might suggest an ID
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


export async function updateExamAction(examId: string, values: z.infer<typeof examUpsertSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const parsed = examUpsertSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (update):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data for update: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }

  try {
    // Transaction to ensure atomicity
    const updatedExamFromDb = await prisma.$transaction(async (tx) => {
      // 1. Delete existing questions and their options for this exam
      const existingQuestions = await tx.question.findMany({
        where: { examId: examId },
        select: { id: true }
      });
      const existingQuestionIds = existingQuestions.map(q => q.id);

      if (existingQuestionIds.length > 0) {
        await tx.questionOption.deleteMany({
          where: { questionId: { in: existingQuestionIds } }
        });
        await tx.question.deleteMany({
          where: { id: { in: existingQuestionIds } }
        });
      }

      // 2. Update exam details (passcode updated only if provided)
      const examDataToUpdate: Partial<PrismaExam> = {
        title: parsed.data.title,
        description: parsed.data.description,
        durationMinutes: parsed.data.durationMinutes,
      };
      if (parsed.data.passcode && parsed.data.passcode.trim() !== "") {
        examDataToUpdate.passcode = parsed.data.passcode;
      }

      const examBeingUpdated = await tx.exam.update({
        where: { id: examId },
        data: {
          ...examDataToUpdate,
          questions: { // 3. Create new questions and options from the form data
            create: parsed.data.questions.map(q_client => {
              let correctAnswerForDb: string | undefined = q_client.correctAnswer;
              if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
                const correctOptionObject = q_client.options.find(opt => opt.text === q_client.correctAnswer);
                // Prefer existing ID if available, otherwise store text
                correctAnswerForDb = correctOptionObject ? (correctOptionObject.id || q_client.correctAnswer) : q_client.correctAnswer;
              }
              return {
                // Do NOT provide q_client.id here for create, let Prisma generate new IDs
                text: q_client.text,
                type: q_client.type as PrismaQuestionType,
                points: q_client.points,
                correctAnswer: correctAnswerForDb,
                options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                  create: q_client.options.map(opt_client => ({
                    // Do NOT provide opt_client.id here, let Prisma generate new IDs
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
      return examBeingUpdated;
    });
    
    const appExam = mapPrismaExamToAppExam(updatedExamFromDb);
    return { success: true, message: "Exam updated successfully!", exam: appExam };

  } catch (error) {
    console.error("Error updating exam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to update exam. ${errorMessage}` };
  }
}


export async function listExamsAction(): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examsFromDb = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { 
          select: { id: true } 
        }
      }
    });

    const appExams: Exam[] = examsFromDb.map(exam => ({
      ...exam,
      description: exam.description ?? "",
      durationMinutes: exam.durationMinutes ?? undefined,
      questions: exam.questions.map(q => ({ id: q.id, text: '', type: 'SHORT_ANSWER', points: 0 })) as Question[],
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
          orderBy: { createdAt: 'asc' }, 
          include: {
            options: { orderBy: { createdAt: 'asc' } }, 
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
    answer: z.union([z.string(), z.array(z.string())]), 
  })),
});

export async function submitExamAnswersAction(values: z.infer<typeof submitExamSchema>): Promise<{ success: boolean; message: string; submissionId?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const parsed = submitExamSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: "Invalid submission data." };
  }

  const mockTakerId = "clmocktakerid123";
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
        answers: {
          create: parsed.data.answers.map(ans => ({
            questionId: ans.questionId,
            answer: ans.answer, 
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

export async function deleteExamAction(examId: string): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  try {
    
    const submissions = await prisma.userSubmission.findMany({
        where: { examId: examId },
        select: { id: true }
    });
    const submissionIds = submissions.map(s => s.id);
    
    if (submissionIds.length > 0) {
        await prisma.userAnswer.deleteMany({
            where: { submissionId: { in: submissionIds } }
        });
    }

    await prisma.userSubmission.deleteMany({
        where: { examId: examId }
    });
    
    const questions = await prisma.question.findMany({
        where: { examId: examId },
        select: { id: true }
    });
    const questionIds = questions.map(q => q.id);

    if (questionIds.length > 0) {
        await prisma.questionOption.deleteMany({
            where: { questionId: { in: questionIds } }
        });
    }

    await prisma.question.deleteMany({
      where: { examId: examId },
    });

    await prisma.exam.delete({
      where: { id: examId },
    });

    return { success: true, message: "Exam deleted successfully." };
  } catch (error) {
    console.error("Error deleting exam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') { 
        return { success: false, message: "Exam not found or already deleted." };
    }
    return { success: false, message: `Failed to delete exam: ${errorMessage}` };
  }
}
