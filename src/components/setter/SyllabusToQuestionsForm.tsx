
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

      {generatedQuestions && generatedQuestions.questions && !isLoading && (
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
    </div>
  );
}
