
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

const formSchema = z.object({
  syllabus: z.string().min(50, { message: "Syllabus must be at least 50 characters long." }),
  generateMcqs: z.boolean().default(false),
  generateTwoMarkQuestions: z.boolean().default(false),
  generateFiveMarkQuestions: z.boolean().default(false),
  isCustomMarks: z.boolean().default(false),
  customQuestionMarksInput: z.string().optional(),
}).refine(data => {
  if (data.isCustomMarks) {
    if (!data.customQuestionMarksInput || data.customQuestionMarksInput.trim() === "") return false; // Must be provided
    const num = Number(data.customQuestionMarksInput);
    return !isNaN(num) && num > 0;
  }
  return true;
}, {
  message: "Custom marks must be a positive number if 'Custom Marks' is checked.",
  path: ["customQuestionMarksInput"],
});

export function SyllabusToQuestionsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      syllabus: "",
      generateMcqs: false,
      generateTwoMarkQuestions: false,
      generateFiveMarkQuestions: false,
      isCustomMarks: false,
      customQuestionMarksInput: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedQuestions(null);

    let apiPayload: GenerateQuestionsInput = {
      syllabus: values.syllabus,
      generateMcqs: values.generateMcqs,
      generateTwoMarkQuestions: values.generateTwoMarkQuestions,
      generateFiveMarkQuestions: values.generateFiveMarkQuestions,
    };

    if (values.isCustomMarks && values.customQuestionMarksInput) {
      const customMarksNum = Number(values.customQuestionMarksInput);
      // Zod refine should catch invalid numbers, but check anyway.
      if (!isNaN(customMarksNum) && customMarksNum > 0) {
        apiPayload.customQuestionMarks = customMarksNum;
      } else {
        // This case should ideally not be hit if Zod validation is working correctly client-side.
        // But if it does, provide feedback.
         toast({
           title: "Invalid Input",
           description: "Custom marks value is not a valid positive number.",
           variant: "destructive",
         });
        setIsLoading(false);
        return;
      }
    }
    
    try {
      const result = await generateExamQuestionsAction(apiPayload);
      if (result.success && result.data) {
        setGeneratedQuestions(result.data);
        toast({
          title: "Questions Generated!",
          description: "AI has suggested questions based on your syllabus.",
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
    <div className="space-y-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" id="syllabus-form">
            <FormField
              control={form.control}
              name="syllabus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="syllabus" className="text-xs md:text-sm font-medium">Syllabus Content</FormLabel>
                  <FormControl>
                    <Textarea
                      id="syllabus"
                      placeholder="Paste your syllabus here..."
                      className="min-h-[80px] md:min-h-[100px] text-[11px]"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-1">
              <FormLabel className="text-xs md:text-sm font-medium">Question Types/Marks (Optional)</FormLabel>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-3 items-start">
                <FormField control={form.control} name="generateMcqs" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateMcqs" /></FormControl>
                    <FormLabel htmlFor="generateMcqs" className="text-xs font-normal cursor-pointer">MCQs</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="generateTwoMarkQuestions" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateTwoMarkQuestions" /></FormControl>
                    <FormLabel htmlFor="generateTwoMarkQuestions" className="text-xs font-normal cursor-pointer">2 Marks</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="generateFiveMarkQuestions" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="generateFiveMarkQuestions" /></FormControl>
                    <FormLabel htmlFor="generateFiveMarkQuestions" className="text-xs font-normal cursor-pointer">5 Marks</FormLabel>
                  </FormItem>
                )} />
                 <div className="flex items-center space-x-1.5 col-span-2 md:col-span-2">
                    <FormField control={form.control} name="isCustomMarks" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="isCustomMarks" /></FormControl>
                            <FormLabel htmlFor="isCustomMarks" className="text-xs font-normal cursor-pointer">Custom:</FormLabel>
                        </FormItem>
                    )} />
                    {form.watch("isCustomMarks") && (
                        <FormField control={form.control} name="customQuestionMarksInput" render={({ field }) => (
                            <FormItem className="flex-grow max-w-[120px]">
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="e.g., 10"
                                        className="h-7 text-[11px] px-2 py-1"
                                        {...field}
                                        value={field.value ?? ""}
                                        min="1"
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )} />
                    )}
                </div>
              </div>
            </div>


          <div className="hidden md:flex justify-end pt-1"> 
            <Button type="submit" disabled={isLoading} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm">
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {isLoading && (
        <div className="mt-3 md:mt-4 flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin text-primary"/>
            <p className="text-xs md:text-sm text-muted-foreground">Generating questions...</p>
        </div>
      )}

      {generatedQuestions && generatedQuestions.questions && generatedQuestions.questions.length > 0 && !isLoading && (
        <div className="mt-3 md:mt-4 border-t pt-2 md:pt-3">
          <h3 className="text-sm md:text-base font-headline font-semibold text-primary mb-1.5 md:mb-2">Suggested Questions:</h3>
          <div className="space-y-2 overflow-y-auto max-h-[150px] md:max-h-[200px] pr-1 md:pr-2">
            {generatedQuestions.questions.map((qObj, index) => (
              <div key={index} className="p-2 md:p-2.5 bg-card border border-border rounded-md shadow-sm">
                {qObj.topic && <h4 className="text-xs md:text-sm font-semibold text-primary mb-0.5 md:mb-1">{qObj.topic}</h4>}
                <p className="whitespace-pre-wrap text-xs text-foreground">
                  {qObj.question.trim()}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 md:mt-2 text-xs text-muted-foreground">
            Review these questions and adapt them as needed for your exam. You can copy and paste them into the exam creation form.
          </p>
        </div>
      )}
       {generatedQuestions && generatedQuestions.questions && generatedQuestions.questions.length === 0 && !isLoading && (
         <div className="mt-3 md:mt-4 border-t pt-2 md:pt-3">
            <p className="text-xs md:text-sm text-muted-foreground text-center py-4">No questions were generated based on the provided syllabus and criteria. Try refining your input.</p>
         </div>
       )}
    </div>
  );
}
