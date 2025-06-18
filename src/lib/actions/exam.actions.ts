
"use server";

import { z } from "zod";
import { query, pool } from "@/lib/db"; // Use new db utility
import type { Exam, Question, QuestionOption, QuestionType as AppQuestionType, SubmissionForEvaluation, SubmissionInfo } from "@/lib/types";
import { Role } from "@/lib/types"; // Use local Role enum
import { database as firebaseRTDB } from "@/lib/firebase"; 
import { ref, set as firebaseSet } from "firebase/database";


// Schemas for client-side validation (matching ExamCreationForm)
const questionOptionSchemaClient = z.object({
  id: z.string().optional(), // Will be ignored on create, used for potential future client-side logic
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchemaClient = z.object({
  id: z.string().optional(), // Will be ignored on create
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
});

const createExamActionPayloadSchema = examPayloadSchema.extend({
  setterId: z.string().min(1, "Setter ID is required"),
});

// Helper to map SQL row to App Exam structure
// This needs to handle potentially multiple rows for the same exam if JOINing questions/options directly
// Or, it can be used after fetching exam and then questions/options separately.
function mapDbRowToAppExam(examRow: any, questions: Question[]): Exam {
  return {
    id: examRow.id,
    title: examRow.title,
    description: examRow.description ?? "",
    passcode: examRow.passcode,
    durationMinutes: examRow.duration_minutes ?? undefined,
    openAt: examRow.open_at ? new Date(examRow.open_at) : undefined,
    setterId: examRow.setter_id,
    createdAt: new Date(examRow.created_at),
    updatedAt: examRow.updated_at ? new Date(examRow.updated_at) : undefined,
    questions: questions,
  };
}

function mapDbRowToAppQuestion(questionRow: any, options: QuestionOption[]): Question {
    return {
        id: questionRow.id,
        text: questionRow.text,
        type: questionRow.type as AppQuestionType,
        points: questionRow.points,
        correctAnswer: questionRow.correct_answer ?? undefined,
        examId: questionRow.exam_id,
        createdAt: new Date(questionRow.created_at),
        updatedAt: questionRow.updated_at ? new Date(questionRow.updated_at): undefined,
        options: options,
    };
}

function mapDbRowToAppOption(optionRow: any): QuestionOption {
    return {
        id: optionRow.id,
        text: optionRow.text,
        questionId: optionRow.question_id,
    };
}


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

    const setterResult = await client.query('SELECT role FROM "User" WHERE id = $1', [parsed.data.setterId]);
    if (setterResult.rows.length === 0 || setterResult.rows[0].role !== Role.SETTER) {
        await client.query('ROLLBACK');
        return { success: false, message: "Invalid or unauthorized setter ID." };
    }

    const examInsertQuery = `
      INSERT INTO "Exam" (title, description, passcode, duration_minutes, open_at, setter_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, title, description, passcode, duration_minutes, open_at, setter_id, created_at, updated_at;
    `;
    const examResult = await client.query(examInsertQuery, [
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
      const questionInsertQuery = `
        INSERT INTO "Question" (exam_id, text, type, points, correct_answer, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, text, type, points, correct_answer, exam_id, created_at, updated_at;
      `;
      // For MCQ, the client might send option text as correct answer. We need to resolve to an option ID if so.
      // For now, we'll store what client sends. If client sends option ID, it's fine.
      // If client sends option text, this needs more robust handling or client-side change.
      // For simplicity here, assume q_client.correctAnswer is either an option ID or the text for short/essay.
      // Prisma schema stored optionId as correctAnswer for MCQs. If client passes option TEXT, this will break logic.
      // For now, let's assume client sends an option's text for MCQ's correctAnswer if `type` is MCQ
      // And it's a string answer for short_answer/essay.
      // The ExamCreationForm's `correctAnswer` for MCQ is indeed the text of the correct option.
      // We must insert options first, get their IDs, then determine the correct option ID to store.
      
      let correctAnswerForDb = q_client.correctAnswer; // For short/essay

      const questionResult = await client.query(questionInsertQuery, [
        examId,
        q_client.text,
        q_client.type,
        q_client.points,
        null, // Placeholder for correct_answer for MCQ, will update later
      ]);
      const createdQuestionRow = questionResult.rows[0];
      const questionId = createdQuestionRow.id;
      const createdOptions: QuestionOption[] = [];

      if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options) {
        let correctOptionIdForDb: string | undefined = undefined;
        for (const opt_client of q_client.options) {
          const optionInsertQuery = `
            INSERT INTO "QuestionOption" (question_id, text, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING id, text, question_id;
          `;
          const optionResult = await client.query(optionInsertQuery, [questionId, opt_client.text]);
          const createdOptionRow = optionResult.rows[0];
          createdOptions.push(mapDbRowToAppOption(createdOptionRow));
          if (q_client.correctAnswer && opt_client.text === q_client.correctAnswer) {
            correctOptionIdForDb = createdOptionRow.id;
          }
        }
        if (correctOptionIdForDb) {
          await client.query('UPDATE "Question" SET correct_answer = $1 WHERE id = $2', [correctOptionIdForDb, questionId]);
          createdQuestionRow.correct_answer = correctOptionIdForDb; // Update the row data
        }
      } else {
         // For non-MCQ, if there's a correctAnswer, update the question with it
        if (q_client.correctAnswer) {
            await client.query('UPDATE "Question" SET correct_answer = $1 WHERE id = $2', [q_client.correctAnswer, questionId]);
            createdQuestionRow.correct_answer = q_client.correctAnswer;
        }
      }
      createdQuestions.push(mapDbRowToAppQuestion(createdQuestionRow, createdOptions));
    }

    await client.query('COMMIT');
    const appExam = mapDbRowToAppExam(createdExamRow, createdQuestions);
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

    // Update Exam details
    const examDataToUpdate: any = {
      title: parsed.data.title,
      description: parsed.data.description,
      duration_minutes: parsed.data.durationMinutes,
      open_at: parsed.data.openAt,
      updated_at: 'NOW()',
    };
    let setClauses = ['title = $1', 'description = $2', 'duration_minutes = $3', 'open_at = $4', 'updated_at = NOW()'];
    let queryParams = [parsed.data.title, parsed.data.description, parsed.data.durationMinutes, parsed.data.openAt];
    
    if (parsed.data.passcode && parsed.data.passcode.trim() !== "") {
      setClauses.push(`passcode = $${queryParams.length + 1}`);
      queryParams.push(parsed.data.passcode);
    }
    queryParams.push(examId);

    const updateExamQuery = `UPDATE "Exam" SET ${setClauses.join(', ')} WHERE id = $${queryParams.length} RETURNING *;`;
    const updatedExamResult = await client.query(updateExamQuery, queryParams);
    if (updatedExamResult.rows.length === 0) {
        throw new Error("Exam not found for update.");
    }
    const updatedExamRow = updatedExamResult.rows[0];

    // Delete old questions and options
    const oldQuestionOptionsResult = await client.query('SELECT id FROM "Question" WHERE exam_id = $1', [examId]);
    if (oldQuestionOptionsResult.rows.length > 0) {
        const oldQuestionIds = oldQuestionOptionsResult.rows.map(r => r.id);
        await client.query('DELETE FROM "QuestionOption" WHERE question_id = ANY($1::TEXT[])', [oldQuestionIds]);
    }
    await client.query('DELETE FROM "Question" WHERE exam_id = $1', [examId]);

    // Create new questions and options
    const createdQuestions: Question[] = [];
    for (const q_client of parsed.data.questions) {
      const questionInsertQuery = `
        INSERT INTO "Question" (exam_id, text, type, points, correct_answer, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, text, type, points, correct_answer, exam_id, created_at, updated_at;
      `;
      const questionResult = await client.query(questionInsertQuery, [
        examId, q_client.text, q_client.type, q_client.points, null // Correct answer updated later for MCQ
      ]);
      const createdQuestionRow = questionResult.rows[0];
      const questionId = createdQuestionRow.id;
      const createdOptions: QuestionOption[] = [];

      if (q_client.type === 'MULTIPLE_CHOICE' && q_client.options) {
        let correctOptionIdForDb: string | undefined = undefined;
        for (const opt_client of q_client.options) {
          const optionInsertQuery = `
            INSERT INTO "QuestionOption" (question_id, text, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING id, text, question_id;
          `;
          const optionResult = await client.query(optionInsertQuery, [questionId, opt_client.text]);
          const createdOptionRow = optionResult.rows[0];
          createdOptions.push(mapDbRowToAppOption(createdOptionRow));
           if (q_client.correctAnswer && opt_client.text === q_client.correctAnswer) {
            correctOptionIdForDb = createdOptionRow.id;
          }
        }
        if (correctOptionIdForDb) {
          await client.query('UPDATE "Question" SET correct_answer = $1 WHERE id = $2', [correctOptionIdForDb, questionId]);
          createdQuestionRow.correct_answer = correctOptionIdForDb;
        }
      } else {
         if (q_client.correctAnswer) {
            await client.query('UPDATE "Question" SET correct_answer = $1 WHERE id = $2', [q_client.correctAnswer, questionId]);
            createdQuestionRow.correct_answer = q_client.correctAnswer;
        }
      }
      createdQuestions.push(mapDbRowToAppQuestion(createdQuestionRow, createdOptions));
    }

    await client.query('COMMIT');
    const appExam = mapDbRowToAppExam(updatedExamRow, createdQuestions);
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
    let submittedExamIdsQuery = '';
    const queryParams: string[] = [];
    if (takerId) {
      submittedExamIdsQuery = 'AND e.id NOT IN (SELECT us.exam_id FROM "UserSubmission" us WHERE us.taker_id = $1)';
      queryParams.push(takerId);
    }

    const examsResult = await query(`
      SELECT e.id, e.title, e.description, e.passcode, e.duration_minutes, e.open_at, e.setter_id, e.created_at, e.updated_at
      FROM "Exam" e
      WHERE 1=1 ${submittedExamIdsQuery}
      ORDER BY e.created_at DESC;
    `, queryParams);

    const appExams: Exam[] = [];
    for (const examRow of examsResult.rows) {
      const questionsResult = await query(`
        SELECT q.id, q.text, q.type, q.points, q.correct_answer, q.exam_id, q.created_at, q.updated_at
        FROM "Question" q
        WHERE q.exam_id = $1
        ORDER BY q.created_at ASC;
      `, [examRow.id]);
      
      const questions: Question[] = [];
      for (const qRow of questionsResult.rows) {
        const optionsResult = await query('SELECT id, text, question_id FROM "QuestionOption" WHERE question_id = $1 ORDER BY created_at ASC', [qRow.id]);
        const options = optionsResult.rows.map(mapDbRowToAppOption);
        questions.push(mapDbRowToAppQuestion(qRow, options));
      }
      appExams.push(mapDbRowToAppExam(examRow, questions));
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
      SELECT id, title, description, passcode, duration_minutes, open_at, setter_id, created_at, updated_at
      FROM "Exam"
      WHERE setter_id = $1
      ORDER BY created_at DESC;
    `, [setterId]);

    const appExams: Exam[] = [];
    for (const examRow of examsResult.rows) {
      const questionsResult = await query(`
        SELECT q.id, q.text, q.type, q.points, q.correct_answer, q.exam_id, q.created_at, q.updated_at
        FROM "Question" q
        WHERE q.exam_id = $1
        ORDER BY q.created_at ASC;
      `, [examRow.id]);
      
      const questions: Question[] = [];
      for (const qRow of questionsResult.rows) {
        const optionsResult = await query('SELECT id, text, question_id FROM "QuestionOption" WHERE question_id = $1 ORDER BY created_at ASC', [qRow.id]);
        const options = optionsResult.rows.map(mapDbRowToAppOption);
        questions.push(mapDbRowToAppQuestion(qRow, options));
      }
      appExams.push(mapDbRowToAppExam(examRow, questions));
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
      SELECT id, title, description, passcode, duration_minutes, open_at, setter_id, created_at, updated_at
      FROM "Exam"
      WHERE id = $1;
    `, [id]);

    if (examResult.rows.length === 0) {
      return { success: false, message: "Exam not found." };
    }
    const examRow = examResult.rows[0];

    const questionsResult = await query(`
      SELECT q.id, q.text, q.type, q.points, q.correct_answer, q.exam_id, q.created_at, q.updated_at
      FROM "Question" q
      WHERE q.exam_id = $1
      ORDER BY q.created_at ASC;
    `, [id]);
    
    const questions: Question[] = [];
    for (const qRow of questionsResult.rows) {
      const optionsResult = await query('SELECT id, text, question_id FROM "QuestionOption" WHERE question_id = $1 ORDER BY created_at ASC', [qRow.id]);
      const options = optionsResult.rows.map(mapDbRowToAppOption);
      questions.push(mapDbRowToAppQuestion(qRow, options));
    }
    
    const appExam = mapDbRowToAppExam(examRow, questions);
    return { success: true, exam: appExam };
  } catch (error) {
    console.error("Error fetching exam by ID (raw SQL):", error);
    return { success: false, message: "Failed to load exam details." };
  }
}

export async function verifyPasscodeAction(examId: string, passcode: string): Promise<{ success: boolean; message?: string; examOpenAt?: Date | null }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const result = await query('SELECT passcode, open_at FROM "Exam" WHERE id = $1', [examId]);
    if (result.rows.length === 0) {
      return { success: false, message: "Exam not found." };
    }
    const exam = result.rows[0];
    if (exam.passcode !== passcode) {
      return { success: false, message: "Incorrect passcode." };
    }
    return { success: true, examOpenAt: exam.open_at ? new Date(exam.open_at) : null };
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

    const takerResult = await client.query('SELECT role FROM "User" WHERE id = $1', [parsed.data.takerId]);
    if (takerResult.rows.length === 0 || takerResult.rows[0].role !== Role.TAKER) {
      await client.query('ROLLBACK');
      return { success: false, message: "Invalid taker." };
    }

    const examDetailsResult = await client.query('SELECT open_at FROM "Exam" WHERE id = $1', [parsed.data.examId]);
    if (examDetailsResult.rows.length > 0 && examDetailsResult.rows[0].open_at && new Date() < new Date(examDetailsResult.rows[0].open_at)) {
      await client.query('ROLLBACK');
      return { success: false, message: "This exam is not yet open for submission." };
    }

    const existingSubmissionResult = await client.query('SELECT id FROM "UserSubmission" WHERE exam_id = $1 AND taker_id = $2', [
      parsed.data.examId, parsed.data.takerId
    ]);
    if (existingSubmissionResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return { success: false, message: "You have already submitted this exam." };
    }

    const submissionInsertResult = await client.query(
      'INSERT INTO "UserSubmission" (exam_id, taker_id, submitted_at, created_at, updated_at, is_evaluated) VALUES ($1, $2, NOW(), NOW(), NOW(), FALSE) RETURNING id',
      [parsed.data.examId, parsed.data.takerId]
    );
    const submissionId = submissionInsertResult.rows[0].id;

    for (const ans of parsed.data.answers) {
      await client.query(
        'INSERT INTO "UserAnswer" (submission_id, question_id, answer, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [submissionId, ans.questionId, JSON.stringify(ans.answer)] // Store answer as JSON string for flexibility
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

    // Order of deletion matters due to foreign key constraints
    // 1. UserAnswers related to submissions for this exam
    await client.query(`
      DELETE FROM "UserAnswer" ua
      USING "UserSubmission" us
      WHERE ua.submission_id = us.id AND us.exam_id = $1;
    `, [examId]);

    // 2. UserSubmissions for this exam
    await client.query('DELETE FROM "UserSubmission" WHERE exam_id = $1;', [examId]);

    // 3. QuestionOptions for questions in this exam
    await client.query(`
      DELETE FROM "QuestionOption" qo
      USING "Question" q
      WHERE qo.question_id = q.id AND q.exam_id = $1;
    `, [examId]);
    
    // 4. Questions for this exam
    await client.query('DELETE FROM "Question" WHERE exam_id = $1;', [examId]);

    // 5. Finally, the Exam itself
    const deleteExamResult = await client.query('DELETE FROM "Exam" WHERE id = $1 RETURNING id;', [examId]);

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
      SELECT us.id as submission_id, us.taker_id, u.email, us.submitted_at, us.is_evaluated, us.evaluated_score
      FROM "UserSubmission" us
      JOIN "User" u ON us.taker_id = u.id
      WHERE us.exam_id = $1
      ORDER BY us.submitted_at DESC;
    `, [examId]);

    if (result.rows.length === 0) {
      return { success: true, submissions: [], message: "No submissions found for this exam yet." };
    }
    
    const submissionsList: SubmissionInfo[] = result.rows.map(row => ({
      submissionId: row.submission_id,
      takerId: row.taker_id,
      email: row.email,
      submittedAt: new Date(row.submitted_at),
      isEvaluated: row.is_evaluated,
      evaluatedScore: row.evaluated_score,
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
        us.id as submission_id, us.exam_id, us.is_evaluated, us.evaluated_score,
        u.email as taker_email,
        e.title as exam_title
      FROM "UserSubmission" us
      JOIN "User" u ON us.taker_id = u.id
      JOIN "Exam" e ON us.exam_id = e.id
      WHERE us.id = $1;
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return { success: false, message: "Submission not found." };
    }
    const subData = submissionResult.rows[0];

    const questionsResult = await query(`
      SELECT q.id, q.text, q.type, q.points, q.correct_answer, ua.answer as user_answer, ua.awarded_marks, ua.feedback
      FROM "Question" q
      LEFT JOIN "UserAnswer" ua ON q.id = ua.question_id AND ua.submission_id = $1
      WHERE q.exam_id = $2
      ORDER BY q.created_at ASC;
    `, [submissionId, subData.exam_id]);

    const mappedQuestions: SubmissionForEvaluation['questions'] = [];
    for (const qRow of questionsResult.rows) {
      const optionsResult = await query('SELECT id, text, question_id FROM "QuestionOption" WHERE question_id = $1 ORDER BY created_at ASC', [qRow.id]);
      const options = optionsResult.rows.map(mapDbRowToAppOption);
      
      let userAnswerFromJson = qRow.user_answer;
      try {
        // UserAnswer.answer is stored as JSON string, parse it back
        if (typeof qRow.user_answer === 'string') {
          userAnswerFromJson = JSON.parse(qRow.user_answer);
        }
      } catch (e) {
        console.warn(`Could not parse user answer JSON for QID ${qRow.id}: ${qRow.user_answer}`, e);
        // Keep as string if parsing fails, or handle as error
      }

      mappedQuestions.push({
        id: qRow.id,
        text: qRow.text,
        type: qRow.type as AppQuestionType,
        points: qRow.points,
        options: options,
        correctAnswer: qRow.correct_answer ?? undefined,
        userAnswer: userAnswerFromJson,
        awardedMarks: qRow.awarded_marks,
        feedback: qRow.feedback,
      });
    }

    const mappedSubmissionData: SubmissionForEvaluation = {
      submissionId: subData.submission_id,
      takerEmail: subData.taker_email,
      examTitle: subData.exam_title,
      examId: subData.exam_id,
      questions: mappedQuestions,
      isEvaluated: subData.is_evaluated,
      evaluatedScore: subData.evaluated_score,
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
      const updateAnswerResult = await client.query(
        'UPDATE "UserAnswer" SET awarded_marks = $1, feedback = $2, updated_at = NOW() WHERE submission_id = $3 AND question_id = $4',
        [evalAns.awardedMarks, evalAns.feedback, submissionId, evalAns.questionId]
      );
      if (updateAnswerResult.rowCount === 0) {
        throw new Error(`No UserAnswer found for submissionId ${submissionId} and questionId ${evalAns.questionId} to update.`);
      }
    }

    await client.query(
      'UPDATE "UserSubmission" SET evaluated_score = $1, is_evaluated = TRUE, updated_at = NOW() WHERE id = $2',
      [totalScore, submissionId]
    );
    
    await client.query('COMMIT');
    dbSuccess = true;

    // Save to Firebase Realtime Database
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
      SELECT u.email, us.submitted_at
      FROM "UserSubmission" us
      JOIN "User" u ON us.taker_id = u.id
      WHERE us.exam_id = $1
      ORDER BY us.submitted_at DESC;
    `, [examId]);

    if (result.rows.length === 0) {
      return { success: true, attendees: [], message: "No attendees found for this exam." };
    }

    const attendeesList: Array<{email: string, submittedAt: Date}> = result.rows.map(row => ({
      email: row.email,
      submittedAt: new Date(row.submitted_at),
    }));

    return { success: true, attendees: attendeesList };
  } catch (error) {
    console.error("Error fetching exam attendees (raw SQL):", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to load attendees. ${errorMessage}` };
  }
}
