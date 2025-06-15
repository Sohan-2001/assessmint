'use server';
import { generateQuestions, type GenerateQuestionsInput, type GenerateQuestionsOutput } from '@/ai/flows/generate-questions-from-syllabus';

export async function generateExamQuestionsAction(input: GenerateQuestionsInput): Promise<{ success: boolean; data?: GenerateQuestionsOutput, error?: string }> {
  try {
    // Input validation can be added here if needed, though genkit flow might do its own.
    const result = await generateQuestions(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error generating questions via AI action:", error);
    // It's good practice to not expose raw error messages to the client.
    // Check if error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to generate questions: ${errorMessage}` };
  }
}
