
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { generateExamQuestionsAction } from "@/lib/actions/ai.actions";
import { Loader2, Sparkles } from "lucide-react";
import type { GenerateQuestionsInput, GenerateQuestionsOutput } from "@/ai/flows/generate-questions-from-syllabus";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const formSchema = z.object({
  syllabus: z.string().min(50, { message: "Syllabus content must be at least 50 characters long." }),
  generateMcqs: z.boolean().default(false),
  generateTwoMarkQuestions: z.boolean().default(false),
  generateFiveMarkQuestions: z.boolean().default(false),
  isCustomMarks: z.boolean().default(false),
  customQuestionMarksInput: z.string().optional(),
}).refine(data => {
  if (data.isCustomMarks) {
    if (!data.customQuestionMarksInput || data.customQuestionMarksInput.trim() === "") return false;
    const num = Number(data.customQuestionMarksInput);
    return !isNaN(num) && num > 0;
  }
  return true;
}, {
  message: "Custom marks must be a positive number if 'Custom Marks' is checked.",
  path: ["customQuestionMarksInput"],
}).refine(data => {
    return data.generateMcqs || data.generateTwoMarkQuestions || data.generateFiveMarkQuestions || data.isCustomMarks;
}, {
    message: "Please select at least one question type or specify custom marks.",
    path: ["generateMcqs"], // Attach error to the first checkbox for simplicity
});

export function PracticeQuestionsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      syllabus: "",
      generateMcqs: true,
      generateTwoMarkQuestions: false,
      generateFiveMarkQuestions: false,
      isCustomMarks: false,
      customQuestionMarksInput: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedQuestions(null);

    const apiPayload: GenerateQuestionsInput = {
      syllabus: values.syllabus,
      generateMcqs: values.generateMcqs,
      generateTwoMarkQuestions: values.generateTwoMarkQuestions,
      generateFiveMarkQuestions: values.generateFiveMarkQuestions,
    };

    if (values.isCustomMarks && values.customQuestionMarksInput) {
      apiPayload.customQuestionMarks = Number(values.customQuestionMarksInput);
    }
    
    try {
      const result = await generateExamQuestionsAction(apiPayload);
      if (result.success && result.data) {
        setGeneratedQuestions(result.data);
        toast({
          title: "Practice Questions Generated!",
          description: "AI has suggested questions based on your input.",
        });
      } else {
        toast({
          title: "Error Generating Questions",
          description: result.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with the AI service.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="syllabus"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel htmlFor="syllabus" className="text-base font-medium">Syllabus / Topic Content</FormLabel>
                        <FormControl>
                            <Textarea
                            id="syllabus"
                            placeholder="Paste your syllabus, notes, or topic description here..."
                            className="min-h-[150px]"
                            {...field}
                            disabled={isLoading}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <div className="space-y-3 pt-2">
                        <FormLabel className="text-base font-medium">Question Types</FormLabel>
                         <p className="text-sm text-muted-foreground">
                            Select at least one question type to generate.
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4 items-start">
                            <FormField control={form.control} name="generateMcqs" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateMcqs" /></FormControl>
                                <FormLabel htmlFor="generateMcqs" className="font-normal cursor-pointer">MCQs</FormLabel>
                            </FormItem>
                            )} />
                            <FormField control={form.control} name="generateTwoMarkQuestions" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateTwoMarkQuestions" /></FormControl>
                                <FormLabel htmlFor="generateTwoMarkQuestions" className="font-normal cursor-pointer">2 Marks</FormLabel>
                            </FormItem>
                            )} />
                            <FormField control={form.control} name="generateFiveMarkQuestions" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateFiveMarkQuestions" /></FormControl>
                                <FormLabel htmlFor="generateFiveMarkQuestions" className="font-normal cursor-pointer">5 Marks</FormLabel>
                            </FormItem>
                            )} />
                            <div className="flex items-center space-x-2">
                                <FormField control={form.control} name="isCustomMarks" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="isCustomMarks" /></FormControl>
                                        <FormLabel htmlFor="isCustomMarks" className="font-normal cursor-pointer">Custom:</FormLabel>
                                    </FormItem>
                                )} />
                                {form.watch("isCustomMarks") && (
                                    <FormField control={form.control} name="customQuestionMarksInput" render={({ field }) => (
                                        <FormItem className="flex-grow max-w-[120px]">
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g., 10"
                                                    className="h-9"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    min="1"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        </div>
                        <FormMessage>{form.formState.errors.generateMcqs?.message}</FormMessage>
                        <FormMessage>{form.formState.errors.customQuestionMarksInput?.message}</FormMessage>
                    </div>

                    <div className="flex justify-end pt-2"> 
                        <Button type="submit" disabled={isLoading} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isLoading ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating...
                            </>
                        ) : (
                            <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Prepare Mock Questions
                            </>
                        )}
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
      
      {isLoading && (
        <div className="mt-6 flex items-center justify-center p-8">
            <Loader2 className="mr-3 h-8 w-8 animate-spin text-primary"/>
            <p className="text-lg text-muted-foreground">The AI is generating your questions...</p>
        </div>
      )}

      {generatedQuestions && generatedQuestions.questions && generatedQuestions.questions.length > 0 && !isLoading && (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">Suggested Practice Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {generatedQuestions.questions.map((qObj, index) => (
              <div key={index} className="p-4 bg-muted/50 border border-border rounded-lg shadow-sm">
                {qObj.topic && <h4 className="text-base font-semibold text-primary mb-1">{qObj.topic}</h4>}
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {qObj.question.trim()}
                </p>
              </div>
            ))}
            <p className="mt-4 text-sm text-muted-foreground">
                Use these questions to test your knowledge. Note that for MCQs, the correct answer is indicated in the generated text.
            </p>
          </CardContent>
        </Card>
      )}
       {generatedQuestions && generatedQuestions.questions && generatedQuestions.questions.length === 0 && !isLoading && (
         <div className="mt-6 border-t pt-6">
            <p className="text-base text-muted-foreground text-center py-8">The AI couldn't generate questions based on your input. Please try adding more detail to the syllabus or adjusting the question types.</p>
         </div>
       )}
    </div>
  );
}
