
// src/ai/flows/generate-questions-from-syllabus.ts
'use server';
/**
 * @fileOverview AI flow to generate exam questions from a given syllabus.
 *
 * - generateQuestions - A function that generates questions based on the syllabus and question type preferences.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  syllabus: z
    .string()
    .describe('The syllabus content to generate questions from.'),
  generateMcqs: z.boolean().optional().describe('If true, generate Multiple Choice Questions.'),
  generateTwoMarkQuestions: z.boolean().optional().describe('If true, generate 2-mark questions.'),
  generateFiveMarkQuestions: z.boolean().optional().describe('If true, generate 5-mark questions.'),
  customQuestionMarks: z.number().positive().optional().describe('If provided, generate questions with these custom marks.'),
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

Based on the user's preferences, generate questions as follows:
{{#if generateMcqs}}
- Include Multiple Choice Questions (MCQs). For each MCQ, provide the question, 4 distinct options (labeled A, B, C, D), and clearly indicate the correct option (e.g., "Correct: C").
{{/if}}
{{#if generateTwoMarkQuestions}}
- Include questions suitable for 2 marks. You can indicate this in the question text, e.g., "(2 marks)".
{{/if}}
{{#if generateFiveMarkQuestions}}
- Include questions suitable for 5 marks. You can indicate this in the question text, e.g., "(5 marks)".
{{/if}}
{{#if customQuestionMarks}}
- Include questions suitable for {{{customQuestionMarks}}} marks. You can indicate this in the question text, e.g., "({{{customQuestionMarks}}} marks)".
{{/if}}
{{#unless generateMcqs}}{{#unless generateTwoMarkQuestions}}{{#unless generateFiveMarkQuestions}}{{#unless customQuestionMarks}}
- Generate general questions based on the syllabus.
{{/unless}}{{/unless}}{{/unless}}{{/unless}}

Prioritize generating questions based on the types requested. If multiple types are requested, try to provide a mix.

Example of desired JSON output format:
{
  "questions": [
    {
      "topic": "Chapter 1: Introduction to Biology",
      "question": "What are the fundamental characteristics of living organisms?"
    },
    {
      "topic": "Chapter 2: Cell Structure (5 marks)",
      "question": "Describe the main differences between prokaryotic and eukaryotic cells."
    },
    {
      "topic": "MCQ Example",
      "question": "Which of the following is a primary color?\\nA) Green\\nB) Orange\\nC) Blue\\nD) Purple\\nCorrect: C"
    }
  ]
}
Ensure your output strictly adheres to this JSON structure and question formatting instructions.
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
    if (!output) {
        throw new Error('AI did not return valid questions in the expected format.');
    }
    return output;
  }
);
