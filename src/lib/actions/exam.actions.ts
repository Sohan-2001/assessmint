
"use server";

import { z } from "zod";
import { query, pool } from "@/lib/db"; // Use new db utility
import type { Exam, Question, QuestionOption, QuestionType as AppQuestionType, SubmissionForEvaluation, SubmissionInfo } from "@/lib/types";
import { Role } from "@/lib/types"; // Use local Role enum
import { database as firebaseRTDB } from "@/lib/firebase"; 
import { ref, set as firebaseSet } from "firebase/database";
import { v4 as uuidv4 } from 'uuid';


// Schemas for client-side validation (matching ExamCreationForm)
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

const examPayloadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters").optional(),
  questions: z.array(questionSchemaClient).min(1, "Exam must have at least one question"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
  openAt: z.date().optional().nullable(),
  allowedTakerEmails: z.string().optional(), // Expecting comma/newline separated string
});

const createExamActionPayloadSchema = examPayloadSchema.extend({
  setterId: z.string().min(1, "Setter ID is required"),
});

// Helper to map SQL row to App Exam structure
function mapDbRowToAppExam(examRow: any, questions: Question[], allowedTakerEmails?: string[]): Exam {
  return {
    id: examRow.id,
    title: examRow.title,
    description: examRow.description ?? "",
    passcode: examRow.passcode,
    durationMinutes: examRow["durationMinutes"] ?? undefined,
    openAt: examRow["openAt"] ? new Date(examRow["openAt"]) : undefined,
    setterId: examRow["setterId"],
    createdAt: new Date(examRow["createdAt"]),
    updatedAt: examRow["updatedAt"] ? new Date(examRow["updatedAt"]) : undefined,
    questions: questions,
    allowedTakerEmails: allowedTakerEmails,
  };
}

function mapDbRowToAppQuestion(questionRow: any, options: QuestionOption[]): Question {
    return {
        id: questionRow.id,
        text: questionRow.text,
        type: questionRow.type as AppQuestionType,
        points: questionRow.points,
        correctAnswer: questionRow["correctAnswer"] ?? undefined,
        examId: questionRow["examId"],
        createdAt: new Date(questionRow["createdAt"]),
        updatedAt: questionRow["updatedAt"] ? new Date(questionRow["updatedAt"]): undefined,
        options: options,
    };
}

function mapDbRowToAppOption(optionRow: any): QuestionOption {
    return {
        id: optionRow.id,
        text: optionRow.text,
        questionId: optionRow["questionId"],
        createdAt: new Date(optionRow["createdAt"]),
        updatedAt: optionRow["updatedAt"] ? new Date(optionRow["updatedAt"]): undefined,
    };
}

const emailSchema = z.string().email("Invalid email address.");

export async function createExamAction(values: z.infer<typeof createExamActionPayloadSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const parsed = createExamActionPayloadSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (create exam):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  if (!parsed.data.passcode) {
    return { success: false, message: "Passcode is required to create an exam." };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const setterResult = await client.query('SELECT "role" FROM "User" WHERE "id" = $1', [parsed.data.setterId]);
    if (setterResult.rows.length === 0 || setterResult.rows[0].role !== Role.SETTER) {
        await client.query('ROLLBACK');
        return { success: false, message: "Invalid or unauthorized setter ID." };
    }

    const newExamId = uuidv4();
    const examInsertQuery = `
      INSERT INTO "Exam" ("id", "title", "description", "passcode", "durationMinutes", "openAt", "setterId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING "id", "title", "description", "passcode", "durationMinutes", "openAt", "setterId", "createdAt", "updatedAt";
    `;
    const examResult = await client.query(examInsertQuery, [
      newExamId,
      parsed.data.title,
      parsed.data.description,
      parsed.data.passcode,
      parsed.data.durationMinutes,
      parsed.data.openAt,
      parsed.data.setterId,
    ]);
    const createdExamRow = examResult.rows[0];
    const examId = createdExamRow.id;

    const createdQuestions: Question[] = [];

    for (const q_client of parsed.data.questions) {
      const newQuestionId = uuidv4();
      const questionInsertQuery = `
        INSERT INTO "Question" ("id", "examId", "text", "type", "points", "correctAnswer", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING "id", "text", "type", "points", "correctAnswer", "examId", "createdAt", "updatedAt";
      `;
      
      const questionResult = await client.query(questionInsertQuery, [
        newQuestionId,
        examId,
        q_client.text,
        q_client.type,
        q_client.points,
        null, 
      ]);
      const createdQuestionRow = questionResult.rows[0];
      const questionId = createdQuestionRow.id;
      const createdOptions: QuestionOption[] = [];

      let correctOptionIdForDb: string | undefined = undefined;

      if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options) {
        for (const opt_client of q_client.options) {
          const newOptionId = uuidv4();
          const optionInsertQuery = `
            INSERT INTO "QuestionOption" ("id", "questionId", "text", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING "id", "text", "questionId", "createdAt", "updatedAt";
          `;
          const optionResult = await client.query(optionInsertQuery, [newOptionId, questionId, opt_client.text]);
          const createdOptionRow = optionResult.rows[0];
          createdOptions.push(mapDbRowToAppOption(createdOptionRow));
          if (q_client.correctAnswer && opt_client.text === q_client.correctAnswer) {
            correctOptionIdForDb = createdOptionRow.id;
          }
        }
        if (correctOptionIdForDb) {
          await client.query('UPDATE "Question" SET "correctAnswer" = $1 WHERE "id" = $2', [correctOptionIdForDb, questionId]);
          createdQuestionRow.correctAnswer = correctOptionIdForDb; 
        }
      } else if ((q_client.type === 'SHORT_ANSWER' || q_client.type === 'ESSAY') && q_client.correctAnswer) {
        await client.query('UPDATE "Question" SET "correctAnswer" = $1 WHERE "id" = $2', [q_client.correctAnswer, questionId]);
        createdQuestionRow.correctAnswer = q_client.correctAnswer;
      }
      createdQuestions.push(mapDbRowToAppQuestion(createdQuestionRow, createdOptions));
    }

    const finalAllowedEmails: string[] = [];
    if (parsed.data.allowedTakerEmails && parsed.data.allowedTakerEmails.trim() !== "") {
        const emails = parsed.data.allowedTakerEmails.split(/[\s,;\n]+/).map(email => email.trim()).filter(email => email);
        for (const email of emails) {
            const parsedEmail = emailSchema.safeParse(email);
            if (parsedEmail.success) {
                await client.query(
                    'INSERT INTO "ExamAllowedTaker" ("examId", "takerEmail", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT ("examId", "takerEmail") DO NOTHING',
                    [examId, parsedEmail.data]
                );
                finalAllowedEmails.push(parsedEmail.data);
            } else {
                console.warn(`Invalid email format skipped: ${email}`);
            }
        }
    }

    await client.query('COMMIT');
    const appExam = mapDbRowToAppExam(createdExamRow, createdQuestions, finalAllowedEmails.length > 0 ? finalAllowedEmails : undefined);
    return { success: true, message: "Exam created successfully!", exam: appExam };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error creating exam (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to create exam. ${errorMessage}` };
  } finally {
    client.release();
  }
}


export async function updateExamAction(examId: string, values: z.infer<typeof examPayloadSchema>): Promise<{ success: boolean; message: string; exam?: Exam }> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const parsed = examPayloadSchema.safeParse(values);
  if (!parsed.success) {
    console.error("Validation errors (update exam):", parsed.error.flatten().fieldErrors);
    return { success: false, message: "Invalid exam data for update: " + JSON.stringify(parsed.error.flatten().fieldErrors) };
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let setClauses = ['"title" = $1', '"description" = $2', '"durationMinutes" = $3', '"openAt" = $4', '"updatedAt" = NOW()'];
    let queryParams: (string | number | Date | null | undefined)[] = [parsed.data.title, parsed.data.description, parsed.data.durationMinutes, parsed.data.openAt];
    
    if (parsed.data.passcode && parsed.data.passcode.trim() !== "") {
      setClauses.push(`"passcode" = $${queryParams.length + 1}`);
      queryParams.push(parsed.data.passcode);
    }
    queryParams.push(examId);

    const updateExamQuery = `UPDATE "Exam" SET ${setClauses.join(', ')} WHERE "id" = $${queryParams.length} RETURNING *;`;
    const updatedExamResult = await client.query(updateExamQuery, queryParams);
    if (updatedExamResult.rows.length === 0) {
        throw new Error("Exam not found for update.");
    }
    const updatedExamRow = updatedExamResult.rows[0];

    const oldQuestionResult = await client.query('SELECT "id" FROM "Question" WHERE "examId" = $1', [examId]);
    if (oldQuestionResult.rows.length > 0) {
        const oldQuestionIds = oldQuestionResult.rows.map(r => r.id);
        await client.query('DELETE FROM "QuestionOption" WHERE "questionId" = ANY($1::TEXT[])', [oldQuestionIds]);
    }
    await client.query('DELETE FROM "Question" WHERE "examId" = $1', [examId]);

    const createdQuestions: Question[] = [];
    for (const q_client of parsed.data.questions) {
      const newQuestionId = q_client.id && !q_client.id.startsWith('new_q_') ? q_client.id : uuidv4(); 
      const questionInsertQuery = `
        INSERT INTO "Question" ("id", "examId", "text", "type", "points", "correctAnswer", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING "id", "text", "type", "points", "correctAnswer", "examId", "createdAt", "updatedAt";
      `;
      const questionResult = await client.query(questionInsertQuery, [
        newQuestionId, examId, q_client.text, q_client.type, q_client.points, null 
      ]);
      const createdQuestionRow = questionResult.rows[0];
      const questionId = createdQuestionRow.id;
      const createdOptions: QuestionOption[] = [];
      let correctOptionIdForDb: string | undefined = undefined;

      if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options) {
        for (const opt_client of q_client.options) {
          const newOptionId = opt_client.id && !opt_client.id.startsWith('new_opt_') ? opt_client.id : uuidv4(); 
          const optionInsertQuery = `
            INSERT INTO "QuestionOption" ("id", "questionId", "text", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING "id", "text", "questionId", "createdAt", "updatedAt";
          `;
          const optionResult = await client.query(optionInsertQuery, [newOptionId, questionId, opt_client.text]);
          const createdOptionRow = optionResult.rows[0];
          createdOptions.push(mapDbRowToAppOption(createdOptionRow));
           if (q_client.correctAnswer && opt_client.text === q_client.correctAnswer) {
            correctOptionIdForDb = createdOptionRow.id;
          }
        }
        if (correctOptionIdForDb) {
          await client.query('UPDATE "Question" SET "correctAnswer" = $1 WHERE "id" = $2', [correctOptionIdForDb, questionId]);
          createdQuestionRow.correctAnswer = correctOptionIdForDb;
        }
      } else if ((q_client.type === 'SHORT_ANSWER' || q_client.type === 'ESSAY') && q_client.correctAnswer) {
        await client.query('UPDATE "Question" SET "correctAnswer" = $1 WHERE "id" = $2', [q_client.correctAnswer, questionId]);
        createdQuestionRow.correctAnswer = q_client.correctAnswer;
      }
      createdQuestions.push(mapDbRowToAppQuestion(createdQuestionRow, createdOptions));
    }

    // Handle allowed takers
    await client.query('DELETE FROM "ExamAllowedTaker" WHERE "examId" = $1', [examId]);
    const finalAllowedEmails: string[] = [];
    if (parsed.data.allowedTakerEmails && parsed.data.allowedTakerEmails.trim() !== "") {
        const emails = parsed.data.allowedTakerEmails.split(/[\s,;\n]+/).map(email => email.trim()).filter(email => email);
        for (const email of emails) {
            const parsedEmail = emailSchema.safeParse(email);
            if (parsedEmail.success) {
                 await client.query(
                    'INSERT INTO "ExamAllowedTaker" ("examId", "takerEmail", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT ("examId", "takerEmail") DO NOTHING',
                    [examId, parsedEmail.data]
                );
                finalAllowedEmails.push(parsedEmail.data);
            } else {
                console.warn(`Invalid email format skipped during update: ${email}`);
            }
        }
    }

    await client.query('COMMIT');
    const appExam = mapDbRowToAppExam(updatedExamRow, createdQuestions, finalAllowedEmails.length > 0 ? finalAllowedEmails : undefined);
    return { success: true, message: "Exam updated successfully!", exam: appExam };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error updating exam (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to update exam. ${errorMessage}` };
  } finally {
    client.release();
  }
}


export async function listExamsAction(takerId?: string): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    // Logic to filter by allowed taker emails will be added in a subsequent step.
    // For now, it lists all exams not yet submitted by the taker.
    let submittedExamIdsQuery = '';
    const queryParams: string[] = [];
    if (takerId) {
      submittedExamIdsQuery = 'AND e."id" NOT IN (SELECT us."examId" FROM "UserSubmission" us WHERE us."takerId" = $1)';
      queryParams.push(takerId);
    }

    const examsResult = await query(`
      SELECT e."id", e."title", e."description", e."passcode", e."durationMinutes", e."openAt", e."setterId", e."createdAt", e."updatedAt"
      FROM "Exam" e
      WHERE 1=1 ${submittedExamIdsQuery}
      ORDER BY e."createdAt" DESC;
    `, queryParams);

    const appExams: Exam[] = [];
    for (const examRow of examsResult.rows) {
      const questionsResult = await query(`
        SELECT q."id", q."text", q."type", q."points", q."correctAnswer", q."examId", q."createdAt", q."updatedAt"
        FROM "Question" q
        WHERE q."examId" = $1
        ORDER BY q."createdAt" ASC;
      `, [examRow.id]);
      
      const questions: Question[] = [];
      for (const qRow of questionsResult.rows) {
        const optionsResult = await query('SELECT "id", "text", "questionId", "createdAt", "updatedAt" FROM "QuestionOption" WHERE "questionId" = $1 ORDER BY "createdAt" ASC', [qRow.id]);
        const options = optionsResult.rows.map(mapDbRowToAppOption);
        questions.push(mapDbRowToAppQuestion(qRow, options));
      }
      // Fetch allowed emails for this exam
      const allowedEmailsResult = await query('SELECT "takerEmail" FROM "ExamAllowedTaker" WHERE "examId" = $1', [examRow.id]);
      const allowedEmails = allowedEmailsResult.rows.map(r => r.takerEmail);

      appExams.push(mapDbRowToAppExam(examRow, questions, allowedEmails.length > 0 ? allowedEmails : undefined));
    }
    return { success: true, exams: appExams };
  } catch (error) {
    console.error("Error listing exams (raw SQL):", error);
    return { success: false, message: "Failed to load exams." };
  }
}

export async function listAllExamsForSetterAction(setterId: string): Promise<{ success: boolean; exams?: Exam[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examsResult = await query(`
      SELECT "id", "title", "description", "passcode", "durationMinutes", "openAt", "setterId", "createdAt", "updatedAt"
      FROM "Exam"
      WHERE "setterId" = $1
      ORDER BY "createdAt" DESC;
    `, [setterId]);

    const appExams: Exam[] = [];
    for (const examRow of examsResult.rows) {
      const questionsResult = await query(`
        SELECT q."id", q."text", q."type", q."points", q."correctAnswer", q."examId", q."createdAt", q."updatedAt"
        FROM "Question" q
        WHERE q."examId" = $1
        ORDER BY q."createdAt" ASC;
      `, [examRow.id]);
      
      const questions: Question[] = [];
      for (const qRow of questionsResult.rows) {
        const optionsResult = await query('SELECT "id", "text", "questionId", "createdAt", "updatedAt" FROM "QuestionOption" WHERE "questionId" = $1 ORDER BY "createdAt" ASC', [qRow.id]);
        const options = optionsResult.rows.map(mapDbRowToAppOption);
        questions.push(mapDbRowToAppQuestion(qRow, options));
      }
      // Fetch allowed emails for this exam
      const allowedEmailsResult = await query('SELECT "takerEmail" FROM "ExamAllowedTaker" WHERE "examId" = $1', [examRow.id]);
      const allowedEmails = allowedEmailsResult.rows.map(r => r.takerEmail);
      
      appExams.push(mapDbRowToAppExam(examRow, questions, allowedEmails.length > 0 ? allowedEmails : undefined));
    }
    return { success: true, exams: appExams };
  } catch (error) {
    console.error("Error listing exams for setter (raw SQL):", error);
    return { success: false, message: "Failed to load exams for setter." };
  }
}

export async function getExamByIdAction(id: string): Promise<{ success: boolean; exam?: Exam; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const examResult = await query(`
      SELECT "id", "title", "description", "passcode", "durationMinutes", "openAt", "setterId", "createdAt", "updatedAt"
      FROM "Exam"
      WHERE "id" = $1;
    `, [id]);

    if (examResult.rows.length === 0) {
      return { success: false, message: "Exam not found." };
    }
    const examRow = examResult.rows[0];

    const questionsResult = await query(`
      SELECT q."id", q."text", q."type", q."points", q."correctAnswer", q."examId", q."createdAt", q."updatedAt"
      FROM "Question" q
      WHERE q."examId" = $1
      ORDER BY q."createdAt" ASC;
    `, [id]);
    
    const questions: Question[] = [];
    for (const qRow of questionsResult.rows) {
      const optionsResult = await query('SELECT "id", "text", "questionId", "createdAt", "updatedAt" FROM "QuestionOption" WHERE "questionId" = $1 ORDER BY "createdAt" ASC', [qRow.id]);
      const options = optionsResult.rows.map(mapDbRowToAppOption);
      questions.push(mapDbRowToAppQuestion(qRow, options));
    }
    
    const allowedEmailsResult = await query('SELECT "takerEmail" FROM "ExamAllowedTaker" WHERE "examId" = $1', [id]);
    const allowedEmails = allowedEmailsResult.rows.map(r => r.takerEmail);

    const appExam = mapDbRowToAppExam(examRow, questions, allowedEmails.length > 0 ? allowedEmails : undefined);
    return { success: true, exam: appExam };
  } catch (error) {
    console.error("Error fetching exam by ID (raw SQL):", error);
    return { success: false, message: "Failed to load exam details." };
  }
}

export async function verifyPasscodeAction(examId: string, passcode: string): Promise<{ success: boolean; message?: string; examOpenAt?: Date | null }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  // Access control based on allowed takers will be added in a subsequent step.
  try {
    const result = await query('SELECT "passcode", "openAt" FROM "Exam" WHERE "id" = $1', [examId]);
    if (result.rows.length === 0) {
      return { success: false, message: "Exam not found." };
    }
    const exam = result.rows[0];
    if (exam.passcode !== passcode) {
      return { success: false, message: "Incorrect passcode." };
    }
    return { success: true, examOpenAt: exam["openAt"] ? new Date(exam["openAt"]) : null };
  } catch (error) {
    console.error("Error verifying passcode (raw SQL):", error);
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
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const takerResult = await client.query('SELECT "role" FROM "User" WHERE "id" = $1', [parsed.data.takerId]);
    if (takerResult.rows.length === 0 || takerResult.rows[0].role !== Role.TAKER) {
      await client.query('ROLLBACK');
      return { success: false, message: "Invalid taker." };
    }

    const examDetailsResult = await client.query('SELECT "openAt" FROM "Exam" WHERE "id" = $1', [parsed.data.examId]);
    if (examDetailsResult.rows.length > 0 && examDetailsResult.rows[0]["openAt"] && new Date() < new Date(examDetailsResult.rows[0]["openAt"])) {
      await client.query('ROLLBACK');
      return { success: false, message: "This exam is not yet open for submission." };
    }

    const existingSubmissionResult = await client.query('SELECT "id" FROM "UserSubmission" WHERE "examId" = $1 AND "takerId" = $2', [
      parsed.data.examId, parsed.data.takerId
    ]);
    if (existingSubmissionResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "You have already submitted this exam." };
    }

    const newSubmissionId = uuidv4();
    const submissionInsertResult = await client.query(
      'INSERT INTO "UserSubmission" ("id", "examId", "takerId", "submittedAt", "createdAt", "updatedAt", "isEvaluated") VALUES ($1, $2, $3, NOW(), NOW(), NOW(), FALSE) RETURNING "id"',
      [newSubmissionId, parsed.data.examId, parsed.data.takerId]
    );
    const submissionId = submissionInsertResult.rows[0].id;

    for (const ans of parsed.data.answers) {
      const newUserAnswerId = uuidv4();
      await client.query(
        'INSERT INTO "UserAnswer" ("id", "submissionId", "questionId", "answer", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [newUserAnswerId, submissionId, ans.questionId, JSON.stringify(ans.answer)] 
      );
    }

    await client.query('COMMIT');
    return { success: true, message: "Exam submitted successfully!", submissionId: submissionId };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error submitting exam answers (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to submit exam. ${errorMessage}` };
  } finally {
    client.release();
  }
}


export async function deleteExamAction(examId: string): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete from ExamAllowedTaker first
    await client.query('DELETE FROM "ExamAllowedTaker" WHERE "examId" = $1;', [examId]);
    // Then proceed with other deletions (which should cascade appropriately or be handled directly)
    await client.query('DELETE FROM "UserAnswer" WHERE "submissionId" IN (SELECT "id" FROM "UserSubmission" WHERE "examId" = $1)', [examId]);
    await client.query('DELETE FROM "UserSubmission" WHERE "examId" = $1;', [examId]);
    await client.query('DELETE FROM "QuestionOption" WHERE "questionId" IN (SELECT "id" FROM "Question" WHERE "examId" = $1)', [examId]);
    await client.query('DELETE FROM "Question" WHERE "examId" = $1;', [examId]);
    const deleteExamResult = await client.query('DELETE FROM "Exam" WHERE "id" = $1 RETURNING "id";', [examId]);
    
    await client.query('COMMIT');
    if (deleteExamResult.rowCount === 0) {
         return { success: false, message: "Exam not found or already deleted." };
    }
    return { success: true, message: "Exam deleted successfully." };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting exam (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to delete exam: ${errorMessage}` };
  } finally {
    client.release();
  }
}


export async function getExamSubmissionsForEvaluationAction(examId: string): Promise<{ success: boolean; submissions?: SubmissionInfo[]; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const result = await query(`
      SELECT us."id" as "submissionId", us."takerId", u."email", us."submittedAt", us."isEvaluated", us."evaluatedScore"
      FROM "UserSubmission" us
      JOIN "User" u ON us."takerId" = u."id"
      WHERE us."examId" = $1
      ORDER BY us."submittedAt" DESC;
    `, [examId]);

    if (result.rows.length === 0) {
      return { success: true, submissions: [], message: "No submissions found for this exam yet." };
    }
    
    const submissionsList: SubmissionInfo[] = result.rows.map(row => ({
      submissionId: row.submissionId,
      takerId: row.takerId,
      email: row.email,
      submittedAt: new Date(row.submittedAt),
      isEvaluated: row.isEvaluated,
      evaluatedScore: row.evaluatedScore,
    }));
    return { success: true, submissions: submissionsList };
  } catch (error) {
    console.error("Error fetching exam submissions (raw SQL):", error);
    return { success: false, message: "Failed to load submissions." };
  }
}

export async function getSubmissionDetailsForEvaluationAction(submissionId: string): Promise<{ success: boolean; submission?: SubmissionForEvaluation; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const submissionResult = await query(`
      SELECT 
        us."id" as "submissionId", us."examId", us."isEvaluated", us."evaluatedScore",
        u."email" as "takerEmail",
        e."title" as "examTitle"
      FROM "UserSubmission" us
      JOIN "User" u ON us."takerId" = u."id"
      JOIN "Exam" e ON us."examId" = e."id"
      WHERE us."id" = $1;
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return { success: false, message: "Submission not found." };
    }
    const subData = submissionResult.rows[0];

    const questionsResult = await query(`
      SELECT q."id", q."text", q."type", q."points", q."correctAnswer", ua."answer" as "userAnswer", ua."awardedMarks", ua."feedback"
      FROM "Question" q
      LEFT JOIN "UserAnswer" ua ON q."id" = ua."questionId" AND ua."submissionId" = $1
      WHERE q."examId" = $2
      ORDER BY q."createdAt" ASC;
    `, [submissionId, subData.examId]);

    const mappedQuestions: SubmissionForEvaluation['questions'] = [];
    for (const qRow of questionsResult.rows) {
      const optionsResult = await query('SELECT "id", "text", "questionId", "createdAt", "updatedAt" FROM "QuestionOption" WHERE "questionId" = $1 ORDER BY "createdAt" ASC', [qRow.id]);
      const options = optionsResult.rows.map(mapDbRowToAppOption);
      
      let userAnswerFromJson = qRow.userAnswer;
      try {
        if (typeof qRow.userAnswer === 'string') {
          userAnswerFromJson = JSON.parse(qRow.userAnswer);
        }
      } catch (e) {
        // console.warn(`Could not parse user answer JSON for QID ${qRow.id}: ${qRow.userAnswer}`, e);
        // Keep userAnswerFromJson as is if parsing fails (it might be a simple string not intended as JSON)
      }

      mappedQuestions.push({
        id: qRow.id,
        text: qRow.text,
        type: qRow.type as AppQuestionType,
        points: qRow.points,
        options: options,
        correctAnswer: qRow.correctAnswer ?? undefined,
        userAnswer: userAnswerFromJson, // Use the potentially parsed value
        awardedMarks: qRow.awardedMarks,
        feedback: qRow.feedback,
        createdAt: qRow.createdAt,
        updatedAt: qRow.updatedAt,
        examId: qRow.examId
      });
    }

    const mappedSubmissionData: SubmissionForEvaluation = {
      submissionId: subData.submissionId,
      takerEmail: subData.takerEmail,
      examTitle: subData.examTitle,
      examId: subData.examId,
      questions: mappedQuestions,
      isEvaluated: subData.isEvaluated,
      evaluatedScore: subData.evaluatedScore,
    };
    return { success: true, submission: mappedSubmissionData };

  } catch (error) {
    console.error("Error fetching submission details (raw SQL):", error);
    return { success: false, message: "Failed to load submission details for evaluation." };
  }
}


export async function saveEvaluationAction(submissionId: string, evaluatedAnswers: Array<{ questionId: string, awardedMarks: number, feedback?: string }>, totalScore: number): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  let dbSuccess = false;
  let firebaseSuccess = false;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const evalAns of evaluatedAnswers) {
      const checkExistence = await client.query(
        'SELECT "id" FROM "UserAnswer" WHERE "submissionId" = $1 AND "questionId" = $2',
        [submissionId, evalAns.questionId]
      );

      if (checkExistence.rowCount > 0) {
        await client.query(
          'UPDATE "UserAnswer" SET "awardedMarks" = $1, "feedback" = $2, "updatedAt" = NOW() WHERE "submissionId" = $3 AND "questionId" = $4',
          [evalAns.awardedMarks, evalAns.feedback, submissionId, evalAns.questionId]
        );
      } else {
        const newUserAnswerId = uuidv4();
        await client.query(
          'INSERT INTO "UserAnswer" ("id", "submissionId", "questionId", "awardedMarks", "feedback", "createdAt", "updatedAt", "answer") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)',
          [newUserAnswerId, submissionId, evalAns.questionId, evalAns.awardedMarks, evalAns.feedback, JSON.stringify(null)] 
        );
      }
    }

    await client.query(
      'UPDATE "UserSubmission" SET "evaluatedScore" = $1, "isEvaluated" = TRUE, "updatedAt" = NOW() WHERE "id" = $2',
      [totalScore, submissionId]
    );
    
    await client.query('COMMIT');
    dbSuccess = true;

    const evaluationDataForFirebase = {
        totalScore: totalScore,
        isEvaluated: true,
        evaluatedAt: new Date().toISOString(),
        answers: evaluatedAnswers.reduce((acc, ans) => {
            acc[ans.questionId] = {
                awardedMarks: ans.awardedMarks,
                feedback: ans.feedback || ""
            };
            return acc;
        }, {} as Record<string, {awardedMarks: number, feedback: string}>)
    };

    const dbRef = ref(firebaseRTDB, `evaluations/${submissionId}`);
    await firebaseSet(dbRef, evaluationDataForFirebase);
    firebaseSuccess = true;

    return { success: true, message: "Evaluation saved successfully to PostgreSQL and Firebase RTDB." };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error saving evaluation (raw SQL / Firebase):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    let detailedMessage = `Failed to save evaluation. DB save: ${dbSuccess ? 'OK' : 'Failed'}. Firebase save: ${firebaseSuccess ? 'OK' : 'Failed'}. Error: ${errorMessage}`;
    return { success: false, message: detailedMessage };
  } finally {
    client.release();
  }
}

export async function getExamTakerEmailsAction(examId: string): Promise<{ success: boolean; attendees?: Array<{email: string, submittedAt: Date}>; message?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const result = await query(`
      SELECT u."email", us."submittedAt"
      FROM "UserSubmission" us
      JOIN "User" u ON us."takerId" = u."id"
      WHERE us."examId" = $1
      ORDER BY us."submittedAt" DESC;
    `, [examId]);

    if (result.rows.length === 0) {
      return { success: true, attendees: [], message: "No attendees found for this exam." };
    }

    const attendeesList: Array<{email: string, submittedAt: Date}> = result.rows.map(row => ({
      email: row.email,
      submittedAt: new Date(row.submittedAt),
    }));

    return { success: true, attendees: attendeesList };
  } catch (error) {
    console.error("Error fetching exam attendees (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to load attendees. ${errorMessage}` };
  }
}
    
