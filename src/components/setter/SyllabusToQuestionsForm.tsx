
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
    <div className="space-y-4"> {/* Reduced space-y from 6 to 4 */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"> {/* Reduced space-y from 6 to 4 */}
            <FormField
              control={form.control}
              name="syllabus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="syllabus" className="text-base font-medium">Syllabus Content</FormLabel> {/* Changed text-lg to text-base */}
                  <FormControl>
                    <Textarea
                      id="syllabus"
                      placeholder="Paste your syllabus here..."
                      className="min-h-[120px] text-sm" /* Reduced min-h, changed text-base to text-sm */
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="flex justify-end pt-1"> {/* Reduced pt from 2 to 1 */}
            <Button type="submit" disabled={isLoading} size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground"> {/* Changed size from lg to default */}
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {/* size="default" button makes icon h-4 w-4 */}
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> {/* size="default" button makes icon h-4 w-4 */}
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {generatedQuestions && (
        <div className="mt-6 border-t pt-4"> {/* Reduced mt and pt */}
          <h3 className="text-lg font-headline font-semibold text-primary mb-3">Suggested Questions:</h3> {/* Reduced font size and mb */}
          <div className="p-2 bg-muted rounded-md whitespace-pre-wrap text-xs overflow-x-auto max-h-[200px]"> {/* Reduced p, text-sm to text-xs, max-h */}
            {generatedQuestions.questions}
          </div>
          <p className="mt-3 text-xs text-muted-foreground"> {/* Reduced mt and text-sm to text-xs */}
            Review these questions and adapt them as needed for your exam. You can copy and paste them into the exam creation form.
          </p>
        </div>
      )}
    </div>
  );
}
