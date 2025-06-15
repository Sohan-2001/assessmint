"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createExamAction } from "@/lib/actions/exam.actions";
import { Loader2, PlusCircle, Trash2, Save, ListChecks } from "lucide-react";
// import type { Question as QuestionType, QuestionOption as QuestionOptionType } from "@/lib/types"; // Using Zod types directly
import { useRouter } from "next/navigation";

const questionOptionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substr(2, 9)), // Auto-generate ID for new options client-side
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substr(2, 9)), // Auto-generate ID for new questions client-side
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(), // For MC, this will be option text. Server action will map to ID if needed.
  points: z.coerce.number().min(0, "Points must be non-negative").default(0),
});

const examFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters long"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional(),
  questions: z.array(questionSchema).min(1, "An exam must have at least one question"),
});

type ExamFormValues = z.infer<typeof examFormSchema>;
type QuestionFormValues = z.infer<typeof questionSchema>;

export function ExamCreationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      title: "",
      description: "",
      passcode: "",
      questions: [{ 
        id: Math.random().toString(36).substr(2, 9), 
        text: "", 
        type: "MULTIPLE_CHOICE", 
        points: 10, 
        options: [
            { id: Math.random().toString(36).substr(2, 9), text: "" }, 
            { id: Math.random().toString(36).substr(2, 9), text: "" }
        ] 
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const addQuestion = () => {
    append({ 
        id: Math.random().toString(36).substr(2, 9),
        text: "", 
        type: "MULTIPLE_CHOICE", 
        points: 10, 
        options: [
            { id: Math.random().toString(36).substr(2, 9), text: "" }, 
            { id: Math.random().toString(36).substr(2, 9), text: "" }
        ] 
    } as QuestionFormValues); // Cast to ensure type safety with default ID
  };

  const addOption = (questionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    form.setValue(`questions.${questionIndex}.options`, [...currentOptions, { id: Math.random().toString(36).substr(2, 9), text: "" }]);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    form.setValue(`questions.${questionIndex}.options`, currentOptions.filter((_, i) => i !== optionIndex));
  };


  async function onSubmit(values: ExamFormValues) {
    setIsLoading(true);
    
    // The server action `createExamAction` will now handle mapping client-side values
    // (like correctAnswer text for MCQs) to the format Prisma expects (like option IDs).
    // Client-generated IDs for questions and options are passed along.
    try {
      const result = await createExamAction(values);
      if (result.success && result.exam) {
        toast({
          title: "Exam Created!",
          description: `"${result.exam.title}" has been successfully created.`,
        });
        form.reset();
        router.push("/setter/dashboard");
      } else {
        toast({
          title: "Error Creating Exam",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-primary flex items-center">
          <ListChecks className="mr-2 h-7 w-7" /> Create New Exam
        </CardTitle>
        <CardDescription>
          Fill in the details below to create your exam. You can add multiple questions of different types.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <div className="space-y-4 p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-headline font-semibold text-primary">Exam Details</h3>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Midterm Biology Exam" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Briefly describe the exam" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="passcode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Passcode</FormLabel>
                    <FormControl><Input type="password" placeholder="e.g., exam2024" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Minutes, Optional)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 60" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-headline font-semibold text-primary">Questions</h3>
              {fields.map((questionItem, questionIndex) => ( // questionItem here is from useFieldArray
                <Card key={questionItem.id} className="p-4 space-y-3 bg-muted/50">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium">Question {questionIndex + 1}</h4>
                    {fields.length > 1 && (
                      <Button type="button" variant="destructive" size="sm" onClick={() => remove(questionIndex)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove Question
                      </Button>
                    )}
                  </div>
                  <FormField control={form.control} name={`questions.${questionIndex}.text`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl><Textarea placeholder="Enter question text" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`questions.${questionIndex}.type`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select question type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                            <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                            <SelectItem value="ESSAY">Essay</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`questions.${questionIndex}.points`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {form.watch(`questions.${questionIndex}.type`) === 'MULTIPLE_CHOICE' && (
                    <div className="pl-4 border-l-2 border-primary/50 space-y-2 mt-2">
                      <h5 className="text-md font-medium">Options</h5>
                      {form.getValues(`questions.${questionIndex}.options`)?.map((_, optionIndex) => (
                         <div key={optionIndex} className="flex items-center gap-2"> {/* Option ID might not be stable for key if reordering happens; consider index for key */}
                           <FormField control={form.control} name={`questions.${questionIndex}.options.${optionIndex}.text`} render={({ field }) => (
                             <FormItem className="flex-grow">
                               <FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} /></FormControl>
                               <FormMessage />
                             </FormItem>
                           )} />
                           { (form.getValues(`questions.${questionIndex}.options`)?.length ?? 0) > 1 &&
                           <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(questionIndex, optionIndex)}>
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                           }
                         </div>
                       ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => addOption(questionIndex)}>
                        <PlusCircle className="h-4 w-4 mr-1" /> Add Option
                      </Button>
                      <FormField control={form.control} name={`questions.${questionIndex}.correctAnswer`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Option Text</FormLabel>
                          <FormControl>
                            <Input placeholder="Text of the correct option" {...field} />
                          </FormControl>
                           <FormMessage />
                           <p className="text-xs text-muted-foreground">Enter the exact text of the correct option from above.</p>
                        </FormItem>
                      )} />
                    </div>
                  )}
                  {(form.watch(`questions.${questionIndex}.type`) === 'SHORT_ANSWER') && (
                     <FormField control={form.control} name={`questions.${questionIndex}.correctAnswer`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Answer (Optional)</FormLabel>
                          <FormControl><Input placeholder="Expected short answer" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  )}
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={addQuestion} className="border-dashed border-primary text-primary">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Another Question
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Save className="mr-2 h-5 w-5" />)}
              {isLoading ? "Saving Exam..." : "Save Exam"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
