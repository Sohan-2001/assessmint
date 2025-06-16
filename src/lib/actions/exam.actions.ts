
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Exam as PrismaExam, Question as PrismaQuestion, QuestionOption as PrismaQuestionOption, QuestionType as PrismaQuestionType } from "@prisma/client";
import type { Exam, Question, QuestionOption } from "@/lib/types"; 

const questionOptionSchemaClient = z.object({
  id: z.string().optional(), 
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchemaClient = z.object({
  id: z.string().optional(), 
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]), 
  options: z.array(questionOptionSchemaClient).optional(),
  correctAnswer: z.string().optional(), 
  points: z.coerce.number().min(0, "Points must be a non-negative number"),
});

// Zod schema for data coming from the form to the server actions
const examPayloadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters").optional(),
  questions: z.array(questionSchemaClient).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
  openAt: z.date().optional().nullable(), // Expecting combined Date object or null
});


function mapPrismaExamToAppExam(prismaExam: PrismaExam & { questions: (PrismaQuestion & { options: PrismaQuestionOption[] })[] }): Exam {
  return {
    ...prismaExam,
    description: prismaExam.description ?? "", 
    durationMinutes: prismaExam.durationMinutes ?? undefined,
    openAt: prismaExam.openAt ?? undefined,
    questions: prismaExam.questions.map(q => ({
      ...q,
      id: q.id, 
      type: q.type as 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY', 
      options: q.options.map(opt => ({ ...opt, id: opt.id })), 
      correctAnswer: q.correctAnswer ?? undefined,
    })),
    createdAt: new Date(prismaExam.createdAt), 
  };
}


export async function createExamAction(values: z.infer<typeof examPayloadSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  const parsed = examPayloadSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (create):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  if (!parsed.data.passcode) { 
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
        passcode: parsed.data.passcode,
        durationMinutes: parsed.data.durationMinutes,
        openAt: parsed.data.openAt, // Save the openAt field
        setterId: mockSetterId, 
        questions: {
          create: parsed.data.questions.map(q_client => {
            let correctAnswerForDb: string | undefined = q_client.correctAnswer;
            if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
              const correctOptionObject = q_client.options.find(opt => opt.text === q_client.correctAnswer);
              correctAnswerForDb = correctOptionObject ? (correctOptionObject.id || q_client.correctAnswer) : q_client.correctAnswer;
            }
            return {
              id: q_client.id, 
              text: q_client.text,
              type: q_client.type as PrismaQuestionType,
              points: q_client.points,
              correctAnswer: correctAnswerForDb,
              options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                create: q_client.options.map(opt_client => ({
                  id: opt_client.id,
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


export async function updateExamAction(examId: string, values: z.infer<typeof examPayloadSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const parsed = examPayloadSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (update):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data for update: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }

  try {
    const updatedExamFromDb = await prisma.$transaction(async (tx) => {
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

      const examDataToUpdate: any = { // Using any temporarily for partial update
        title: parsed.data.title,
        description: parsed.data.description,
        durationMinutes: parsed.data.durationMinutes,
        openAt: parsed.data.openAt, // Include openAt in update
      };
      if (parsed.data.passcode && parsed.data.passcode.trim() !== "") {
        examDataToUpdate.passcode = parsed.data.passcode;
      }

      const examBeingUpdated = await tx.exam.update({
        where: { id: examId },
        data: {
          ...examDataToUpdate,
          questions: { 
            create: parsed.data.questions.map(q_client => {
              let correctAnswerForDb: string | undefined = q_client.correctAnswer;
              if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
                const correctOptionObject = q_client.options.find(opt => opt.text === q_client.correctAnswer);
                correctAnswerForDb = correctOptionObject ? (correctOptionObject.id || q_client.correctAnswer) : q_client.correctAnswer;
              }
              return {
                text: q_client.text,
                type: q_client.type as PrismaQuestionType,
                points: q_client.points,
                correctAnswer: correctAnswerForDb,
                options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                  create: q_client.options.map(opt_client => ({
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
      openAt: exam.openAt ?? undefined,
      questions: exam.questions.map(q => ({ id: q.id, text: '', type: 'SHORT_ANSWER', points: 0 })) as Question[], // Simplified for list view
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

export async function verifyPasscodeAction(examId: string, passcode: string): Promise<{ success: boolean; message?: string; examOpenAt?: Date | null }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { passcode: true, openAt: true },
    });

    if (!exam) {
      return { success: false, message: "Exam not found." };
    }
    if (exam.passcode !== passcode) {
      return { success: false, message: "Incorrect passcode." };
    }
    // Passcode is correct, return success and openAt time for client-side check
    return { success: true, examOpenAt: exam.openAt };
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
    // Before submission, quickly check if exam is open (if scheduled)
    const examDetails = await prisma.exam.findUnique({
        where: { id: parsed.data.examId },
        select: { openAt: true }
    });
    if (examDetails?.openAt && new Date() < new Date(examDetails.openAt)) {
        return { success: false, message: "This exam is not yet open for submission." };
    }


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
