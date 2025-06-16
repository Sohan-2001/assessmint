
// src/ai/flows/generate-questions-from-syllabus.ts
'use server';
/**
 * @fileOverview AI flow to generate exam questions from a given syllabus.
 *
 * - generateQuestions - A function that generates questions based on the syllabus.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  syllabus: z
    .string()
    .describe('The syllabus content to generate questions from.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const QuestionObjectSchema = z.object({
  topic: z.string().describe('The topic or category of the question, suitable as a subheading.'),
  question: z.string().describe('The full text of the question itself.'),
});

const GenerateQuestionsOutputSchema = z.object({
  questions: z
    .array(QuestionObjectSchema)
    .describe('A list of suggested question objects, each with a topic and question text.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are an expert exam question generator. Please analyze the given syllabus and suggest relevant exam questions.
Return your response as a JSON array of objects, where each object has two keys: "topic" (string, representing the subject or category of the question, suitable for a subheading) and "question" (string, the full text of the question).

Syllabus:
{{{syllabus}}}

Example of desired JSON output format:
{
  "questions": [
    {
      "topic": "Chapter 1: Introduction to Biology",
      "question": "What are the fundamental characteristics of living organisms?"
    },
    {
      "topic": "Chapter 2: Cell Structure",
      "question": "Describe the main differences between prokaryotic and eukaryotic cells."
    }
  ]
}
Ensure your output strictly adheres to this JSON structure.
`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateQuestionsPrompt(input);
    // The output should already conform to GenerateQuestionsOutputSchema due to ai.definePrompt
    // If output is null or undefined, it means the LLM call failed or returned non-conforming data.
    // Genkit handles parsing based on the schema; if it fails, an error would typically be thrown.
    if (!output) {
        throw new Error('AI did not return valid questions in the expected format.');
    }
    return output;
  }
);

