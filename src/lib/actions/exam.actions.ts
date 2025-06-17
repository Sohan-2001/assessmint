
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Exam as PrismaExam, Question as PrismaQuestion, QuestionOption as PrismaQuestionOption, QuestionType as PrismaQuestionType, UserAnswer as PrismaUserAnswer } from "@prisma/client";
import type { Exam, Question, QuestionOption, QuestionType as AppQuestionType, SubmissionForEvaluation } from "@/lib/types"; 

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

// Base schema for exam data, used by both create and update, and form
const examPayloadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters").optional(),
  questions: z.array(questionSchemaClient).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
  openAt: z.date().optional().nullable(),
});

// Specific schema for creating an exam, includes setterId
const createExamActionPayloadSchema = examPayloadSchema.extend({
  setterId: z.string().min(1, "Setter ID is required"),
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


export async function createExamAction(values: z.infer<typeof createExamActionPayloadSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  const parsed = createExamActionPayloadSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (create):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  if (!parsed.data.passcode) { 
    return { success: false, message: "Passcode is required to create an exam." };
  }
  
  // Ensure the setter exists (optional, depends on strictness)
  const setter = await prisma.user.findUnique({ where: { id: parsed.data.setterId } });
  if (!setter || setter.role !== 'SETTER') {
      return { success: false, message: "Invalid or unauthorized setter ID." };
  }

  try {
    const createdExamFromDb = await prisma.exam.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        passcode: parsed.data.passcode,
        durationMinutes: parsed.data.durationMinutes,
        openAt: parsed.data.openAt,
        setterId: parsed.data.setterId, // Use the provided setterId
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

      const examDataToUpdate: any = { 
        title: parsed.data.title,
        description: parsed.data.description,
        durationMinutes: parsed.data.durationMinutes,
        openAt: parsed.data.openAt,
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


export async function listExamsAction(takerId?: string): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    let submittedExamIds: string[] = [];
    if (takerId) {
      const submissions = await prisma.userSubmission.findMany({
        where: { takerId: takerId },
        select: { examId: true }
      });
      submittedExamIds = submissions.map(s => s.examId);
    }

    const examsFromDb = await prisma.exam.findMany({
      where: {
        id: {
          notIn: submittedExamIds 
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { 
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, type: true, points: true, correctAnswer: true, options: { orderBy: { createdAt: 'asc' }} } 
        }
      }
    });

    const appExams: Exam[] = examsFromDb.map(exam => mapPrismaExamToAppExam(exam as any)); 
    return { success: true, exams: appExams };
  } catch (error) {
    console.error("Error listing exams:", error);
    return { success: false, message: "Failed to load exams." };
  }
}


export async function listAllExamsForSetterAction(setterId: string): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examsFromDb = await prisma.exam.findMany({
      where: {
        setterId: setterId 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { 
          orderBy: { createdAt: 'asc' },
          select: { id: true, text: true, type: true, points: true, correctAnswer: true, options: { orderBy: { createdAt: 'asc' }} }
        }
      }
    });

    const appExams: Exam[] = examsFromDb.map(exam => mapPrismaExamToAppExam(exam as any));
    return { success: true, exams: appExams };
  } catch (error) {
    console.error("Error listing exams for setter:", error);
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
    return { success: true, examOpenAt: exam.openAt };
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return { success: false, message: "Error during passcode verification." };
  }
}

const submitExamSchema = z.object({
  examId: z.string(),
  takerId: z.string(), 
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
  
  const taker = await prisma.user.findUnique({ where: { id: parsed.data.takerId } });
  if (!taker || taker.role !== 'TAKER') {
      return { success: false, message: "Invalid taker." };
  }
  
  try {
    const examDetails = await prisma.exam.findUnique({
        where: { id: parsed.data.examId },
        select: { openAt: true }
    });
    if (examDetails?.openAt && new Date() < new Date(examDetails.openAt)) {
        return { success: false, message: "This exam is not yet open for submission." };
    }

    const existingSubmission = await prisma.userSubmission.findFirst({
        where: {
            examId: parsed.data.examId,
            takerId: parsed.data.takerId
        }
    });

    if (existingSubmission) {
        return { success: false, message: "You have already submitted this exam." };
    }

    const submission = await prisma.userSubmission.create({
      data: {
        examId: parsed.data.examId,
        takerId: parsed.data.takerId, 
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

export type SubmissionInfo = {
  submissionId: string;
  takerId: string;
  email: string;
  submittedAt: Date;
  isEvaluated: boolean;
  evaluatedScore?: number | null;
};

export async function getExamSubmissionsForEvaluationAction(examId: string): Promise<{ success: boolean; submissions?: SubmissionInfo[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const submissionsFromDb = await prisma.userSubmission.findMany({
      where: { examId: examId },
      include: {
        taker: { 
          select: { email: true, id: true }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    if (!submissionsFromDb || submissionsFromDb.length === 0) {
      return { success: true, submissions: [], message: "No submissions found for this exam yet." };
    }

    const submissionsList: SubmissionInfo[] = submissionsFromDb.map(sub => ({
      submissionId: sub.id,
      takerId: sub.takerId,
      email: sub.taker.email,
      submittedAt: sub.submittedAt,
      isEvaluated: sub.isEvaluated,
      evaluatedScore: sub.evaluatedScore,
    }));

    return { success: true, submissions: submissionsList };
  } catch (error) {
    console.error("Error fetching exam submissions for evaluation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to load submissions. ${errorMessage}` };
  }
}


export async function getSubmissionDetailsForEvaluationAction(submissionId: string): Promise<{ success: boolean; submission?: SubmissionForEvaluation; message?: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        const submission = await prisma.userSubmission.findUnique({
            where: { id: submissionId },
            include: {
                taker: { select: { email: true }},
                exam: { 
                    include: { 
                        questions: { 
                            orderBy: { createdAt: 'asc' },
                            include: { options: { orderBy: { createdAt: 'asc' }} }
                        }
                    }
                },
                answers: { 
                    orderBy: { question: { createdAt: 'asc' }}
                 } 
            }
        });

        if (!submission) {
            return { success: false, message: "Submission not found." };
        }

        const mappedQuestions: Question[] = submission.exam.questions.map(q_prisma => {
            const userAnswerRecord = submission.answers.find(a => a.questionId === q_prisma.id);
            return {
                id: q_prisma.id,
                text: q_prisma.text,
                type: q_prisma.type as AppQuestionType,
                points: q_prisma.points,
                options: q_prisma.options.map(opt => ({ id: opt.id, text: opt.text })),
                correctAnswer: q_prisma.correctAnswer ?? undefined,
                userAnswer: userAnswerRecord?.answer as (string | string[] | undefined), 
                awardedMarks: userAnswerRecord?.awardedMarks,
                feedback: userAnswerRecord?.feedback,
            };
        });

        const mappedSubmissionData: SubmissionForEvaluation = {
            submissionId: submission.id,
            takerEmail: submission.taker.email,
            examTitle: submission.exam.title,
            examId: submission.exam.id,
            questions: mappedQuestions,
            isEvaluated: submission.isEvaluated,
            evaluatedScore: submission.evaluatedScore,
        };
        return { success: true, submission: mappedSubmissionData };

    } catch (error) {
        console.error("Error fetching submission details:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to load submission details. ${errorMessage}` };
    }
}


export async function saveEvaluationAction(submissionId: string, evaluatedAnswers: Array<{ questionId: string, awardedMarks: number, feedback?: string }>, totalScore: number): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
        const submission = await prisma.userSubmission.findUnique({
            where: {id: submissionId},
            include: {answers: {select: {questionId: true, id: true}}} 
        });
        if (!submission) throw new Error("Submission not found for validation.");

        const answerQuestionIdsInDb = new Set(submission.answers.map(a => a.questionId));
        const evaluatedQuestionIdsProvided = new Set(evaluatedAnswers.map(e => e.questionId));

        if (answerQuestionIdsInDb.size !== evaluatedQuestionIdsProvided.size || !Array.from(answerQuestionIdsInDb).every(id => evaluatedQuestionIdsProvided.has(id))) {
            throw new Error("Mismatch between submitted questions and evaluated answers. Ensure all questions are evaluated.");
        }


        await prisma.$transaction(async (tx) => {
            for (const evalAns of evaluatedAnswers) {
                 const userAnswerToUpdate = submission.answers.find(a => a.questionId === evalAns.questionId);
                 if (!userAnswerToUpdate) { // Should not happen due to check above, but defensive
                    throw new Error(`Answer for question ID ${evalAns.questionId} not found in submission ${submissionId}. Evaluation cannot proceed.`);
                 }

                await tx.userAnswer.update({ 
                    where: {
                        id: userAnswerToUpdate.id 
                    },
                    data: {
                        awardedMarks: evalAns.awardedMarks,
                        feedback: evalAns.feedback,
                    }
                });
            }
            await tx.userSubmission.update({
                where: { id: submissionId },
                data: {
                    evaluatedScore: totalScore,
                    isEvaluated: true,
                }
            });
        });
        return { success: true, message: "Evaluation saved successfully." };
    } catch (error) {
        console.error("Error saving evaluation:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to save evaluation: ${errorMessage}` };
    }
}



export async function getExamTakerEmailsAction(examId: string): Promise<{ success: boolean; attendees?: Array<{email: string, submittedAt: Date}>; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const submissions = await prisma.userSubmission.findMany({
      where: { examId: examId },
      include: {
        taker: { 
          select: { email: true }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    if (!submissions || submissions.length === 0) {
      return { success: true, attendees: [], message: "No attendees found for this exam." };
    }

    const attendeesList: Array<{email: string, submittedAt: Date}> = submissions.map(sub => ({
      email: sub.taker.email,
      submittedAt: sub.submittedAt,
    }));

    return { success: true, attendees: attendeesList };
  } catch (error) {
    console.error("Error fetching exam attendees:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to load attendees. ${errorMessage}` };
  }
}
