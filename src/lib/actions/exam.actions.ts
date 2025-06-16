
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
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
});


// Helper to map Prisma Exam to our frontend Exam type
function mapPrismaExamToAppExam(prismaExam: PrismaExam & { questions: (PrismaQuestion & { options: PrismaQuestionOption[] })[] }): Exam {
  return {
    ...prismaExam,
    description: prismaExam.description ?? "", // Ensure description is string
    durationMinutes: prismaExam.durationMinutes ?? undefined,
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
            
            // For MCQs, the correctAnswer from the client is the *text* of the correct option.
            // We need to find the corresponding option *ID* if the client sent one, or let Prisma generate it.
            // If client sends an ID for an option, we should use it.
            // The `correctAnswer` stored in DB for MCQ should ideally be the ID of the *correct option*.
            if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options && q_client.correctAnswer) {
              const correctOptionObject = q_client.options.find(opt => opt.text === q_client.correctAnswer);
              if (correctOptionObject) {
                 // If the client provided an ID for this option, we use that.
                 // If not, this will be undefined, and Prisma will generate an ID for the option.
                 // Storing the TEXT of the correct answer in the Question.correctAnswer for MCQ if ID is not available
                 // might be a fallback, but linking by ID is more robust.
                 // For simplicity now: if options have IDs from client, use that, else we can't directly link by ID in this nested create.
                 // Let's assume `q_client.correctAnswer` is the option text for now, and store that.
                 // Or, better: if an option has an ID, and its text matches, store that ID.
                 correctAnswerForDb = correctOptionObject.id ?? q_client.correctAnswer; // Prefer ID if available and matches text
              } else {
                // Correct answer text was provided, but no matching option text found. This is a data integrity issue.
                // For now, we'll still store the provided correctAnswer text.
                correctAnswerForDb = q_client.correctAnswer;
              }
            }

            return {
              id: q_client.id, // Use client-provided ID if available
              text: q_client.text,
              type: q_client.type as PrismaQuestionType,
              points: q_client.points,
              correctAnswer: correctAnswerForDb,
              options: q_client.type === 'MULTIPLE_CHOICE' && q_client.options ? {
                create: q_client.options.map(opt_client => ({
                  id: opt_client.id, // Use client-provided ID for options
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
        questions: { 
          select: { id: true } 
        }
      }
    });

    // Map to frontend Exam type
    const appExams: Exam[] = examsFromDb.map(exam => ({
      ...exam,
      description: exam.description ?? "",
      durationMinutes: exam.durationMinutes ?? undefined,
      // For list view, we only need the count of questions, not the full question objects.
      // The 'questions' include from Prisma gives us {id: string}[].
      // So, map this to a simplified Question stub for type consistency or just use length.
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

  // Mock taker ID
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
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  try {
    // Need to delete related UserSubmissions and their Answers first due to foreign key constraints
    // Or use cascading delete if schema is set up for it. Assuming direct deletion for now
    // and that answers/submissions might prevent exam deletion if not handled.

    // First, delete UserAnswer records associated with submissions for this exam
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

    // Then, delete UserSubmission records for this exam
    await prisma.userSubmission.deleteMany({
        where: { examId: examId }
    });
    
    // Then, delete QuestionOptions for questions in this exam
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

    // Then, delete Questions for this exam
    await prisma.question.deleteMany({
      where: { examId: examId },
    });

    // Finally, delete the Exam itself
    await prisma.exam.delete({
      where: { id: examId },
    });

    return { success: true, message: "Exam deleted successfully." };
  } catch (error) {
    console.error("Error deleting exam:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') { // Prisma's record not found error
        return { success: false, message: "Exam not found or already deleted." };
    }
    return { success: false, message: `Failed to delete exam: ${errorMessage}` };
  }
}
