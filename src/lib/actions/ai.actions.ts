'use server';
import { generateQuestions, type GenerateQuestionsInput, type GenerateQuestionsOutput } from '@/ai/flows/generate-questions-from-syllabus';
import { autoEvaluateSubmission, type AutoEvaluateSubmissionInput, type AutoEvaluateSubmissionOutput } from '@/ai/flows/auto-evaluate-submission-flow';
import { getSubmissionDetailsForEvaluationAction, saveEvaluationAction } from '@/lib/actions/exam.actions';
import type { Question, QuestionOption as AppQuestionOption } from '@/lib/types';

export async function generateExamQuestionsAction(input: GenerateQuestionsInput): Promise<{ success: boolean; data?: GenerateQuestionsOutput, error?: string }> {
  try {
    const result = await generateQuestions(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating questions via AI action:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to generate questions: ${errorMessage}` };
  }
}

export async function autoEvaluateSubmissionAction(submissionId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch submission details
    const submissionDetailsResult = await getSubmissionDetailsForEvaluationAction(submissionId);
    if (!submissionDetailsResult.success || !submissionDetailsResult.submission) {
      return { success: false, message: submissionDetailsResult.message || "Failed to fetch submission details for AI evaluation." };
    }
    const submissionData = submissionDetailsResult.submission;

    // 2. Transform data for the AI flow
    const aiFlowInput: AutoEvaluateSubmissionInput = {
      questions: submissionData.questions.map(q => {
        let userAnswerText: string;
        let optionsTextArray: string[] | undefined;
        let correctAnswerTextForAI: string | undefined = q.correctAnswer; // Default for short answer/essay

        if (q.type === 'MULTIPLE_CHOICE') {
          optionsTextArray = q.options?.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt.text}`) || [];
          const selectedOption = q.options?.find(opt => opt.id === q.userAnswer);
          userAnswerText = selectedOption ? selectedOption.text : "No answer provided";
          
          const correctOptionObj = q.options?.find(opt => opt.id === q.correctAnswer);
          correctAnswerTextForAI = correctOptionObj ? correctOptionObj.text : undefined;

        } else {
          userAnswerText = Array.isArray(q.userAnswer) 
            ? q.userAnswer.join(", ") 
            : (q.userAnswer || "No answer provided");
        }

        return {
          questionId: q.id,
          questionText: q.text,
          questionType: q.type,
          questionPoints: q.points,
          userAnswerText: userAnswerText,
          optionsText: optionsTextArray,
          correctAnswerText: correctAnswerTextForAI,
        };
      }),
    };

    // 3. Call the Genkit flow
    const aiEvaluationResult = await autoEvaluateSubmission(aiFlowInput);

    // 4. Save the AI's evaluation
    const saveResult = await saveEvaluationAction(
      submissionId,
      aiEvaluationResult.evaluatedAnswers,
      aiEvaluationResult.totalScore
    );

    if (saveResult.success) {
      return { success: true, message: "Submission auto-evaluated and saved successfully by AI." };
    } else {
      return { success: false, message: `AI evaluation completed, but failed to save: ${saveResult.message}` };
    }

  } catch (error) {
    console.error("Error during auto-evaluation action:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI auto-evaluation.";
    return { success: false, message: errorMessage };
  }
}
