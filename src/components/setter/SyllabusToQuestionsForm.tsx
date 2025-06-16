
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
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="syllabus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="syllabus" className="text-lg font-medium">Syllabus Content</FormLabel>
                  <FormControl>
                    <Textarea
                      id="syllabus"
                      placeholder="Paste your syllabus here... e.g., Course Objectives, Topics Covered, Learning Outcomes..."
                      className="min-h-[200px] text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {generatedQuestions && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-xl font-headline font-semibold text-primary mb-4">Suggested Questions:</h3>
          <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm overflow-x-auto max-h-[300px]">
            {generatedQuestions.questions}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Review these questions and adapt them as needed for your exam. You can copy and paste them into the exam creation form.
          </p>
        </div>
      )}
    </div>
  );
}
