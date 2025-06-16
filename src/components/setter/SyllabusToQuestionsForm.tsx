
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { generateExamQuestionsAction } from "@/lib/actions/ai.actions";
import { Loader2, Sparkles } from "lucide-react";
import type { GenerateQuestionsOutput } from "@/ai/flows/generate-questions-from-syllabus";

const formSchema = z.object({
  syllabus: z.string().min(50, { message: "Syllabus must be at least 50 characters long." }),
});

export function SyllabusToQuestionsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      syllabus: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedQuestions(null);
    try {
      const result = await generateExamQuestionsAction({ syllabus: values.syllabus });
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
    <div className="space-y-2"> {/* Reduced space-y */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" id="syllabus-form"> {/* Reduced space-y, added ID */}
            <FormField
              control={form.control}
              name="syllabus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="syllabus" className="text-sm font-medium">Syllabus Content</FormLabel> {/* text-base -> text-sm */}
                  <FormControl>
                    <Textarea
                      id="syllabus"
                      placeholder="Paste your syllabus here..."
                      className="min-h-[100px] text-xs" /* Reduced min-h, text-sm -> text-xs */
                      {...field}
                      disabled={isLoading} // Disable textarea while loading
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          {/* Button below is hidden on mobile (screens smaller than md), visible on md and up */}
          <div className="hidden md:flex justify-end pt-1"> 
            <Button type="submit" disabled={isLoading} size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {isLoading && ( // Show a loading indicator for the results area
        <div className="mt-4 flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary"/>
            <p className="text-sm text-muted-foreground">Generating questions...</p>
        </div>
      )}

      {generatedQuestions && !isLoading && ( // Only show results if not loading
        <div className="mt-4 border-t pt-3"> {/* Reduced mt and pt */}
          <h3 className="text-base font-headline font-semibold text-primary mb-2">Suggested Questions:</h3> {/* Reduced font size and mb */}
          <div className="p-1.5 bg-muted rounded-md whitespace-pre-wrap text-xs overflow-x-auto max-h-[150px]"> {/* Reduced p, max-h */}
            {generatedQuestions.questions}
          </div>
          <p className="mt-2 text-xs text-muted-foreground"> {/* Reduced mt */}
            Review these questions and adapt them as needed for your exam. You can copy and paste them into the exam creation form.
          </p>
        </div>
      )}
    </div>
  );
}
