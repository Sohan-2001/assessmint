
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
import { useRouter } from "next/navigation";

const questionOptionSchema = z.object({
  id: z.string().default(() => `opt_${Math.random().toString(36).substr(2, 9)}`),
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
  id: z.string().default(() => `q_${Math.random().toString(36).substr(2, 9)}`),
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  points: z.coerce.number().min(0, "Points must be non-negative").default(0),
});

const examFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters long"),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
  questions: z.array(questionSchema).min(1, "An exam must have at least one question"),
});

type ExamFormValues = z.infer<typeof examFormSchema>;
type QuestionFormValues = z.infer<typeof questionSchema>;

function QuestionOptions({ control, questionIndex, questionType }: { control: any, questionIndex: number, questionType: QuestionFormValues['type'] }) {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`
  });

  const handleAddOption = () => {
    appendOption({ text: "" });
  };

  if (questionType !== 'MULTIPLE_CHOICE') {
    return null;
  }

  return (
    <div className="pl-2 md:pl-4 border-l-2 border-primary/50 space-y-2 mt-2">
      <h5 className="text-sm md:text-base font-medium">Options</h5>
      {optionFields.map((optionItem, optionIndex) => (
         <div key={optionItem.id} className="flex items-center gap-2">
           <FormField control={control} name={`questions.${questionIndex}.options.${optionIndex}.text`} render={({ field }) => (
             <FormItem className="flex-grow">
               <FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} value={field.value ?? ""} /></FormControl>
               <FormMessage />
             </FormItem>
           )} />
           { optionFields.length > 1 &&
           <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)}>
             <Trash2 className="h-4 w-4 text-destructive" />
           </Button>
           }
         </div>
       ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
        <PlusCircle className="h-4 w-4 mr-1" /> Add Option
      </Button>
      <FormField control={control} name={`questions.${questionIndex}.correctAnswer`} render={({ field }) => (
        <FormItem>
          <FormLabel>Correct Option Text</FormLabel>
          <FormControl>
            <Input placeholder="Text of the correct option" {...field} value={field.value ?? ""} />
          </FormControl>
           <FormMessage />
           <p className="text-xs text-muted-foreground">Enter the exact text of the correct option from above.</p>
        </FormItem>
      )} />
    </div>
  );
}


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
      durationMinutes: undefined,
      questions: [{
        id: `q_${Math.random().toString(36).substr(2, 9)}`,
        text: "",
        type: "MULTIPLE_CHOICE",
        points: 10,
        options: [
            { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" },
            { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" }
        ],
        correctAnswer: undefined, // Explicitly undefined initially
      }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const addQuestion = () => {
    appendQuestion({
        id: `q_${Math.random().toString(36).substr(2, 9)}`,
        text: "",
        type: "MULTIPLE_CHOICE",
        points: 10,
        options: [
            { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" },
            { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" }
        ],
        correctAnswer: undefined, // New questions also have undefined correctAnswer
    });
  };


  async function onSubmit(values: ExamFormValues) {
    setIsLoading(true);

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
        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-headline text-primary flex items-center">
          <ListChecks className="mr-2 h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" /> Create New Exam
        </CardTitle>
        <CardDescription className="text-xs md:text-sm lg:text-base">
          Fill in the details below to create your exam. You can add multiple questions of different types.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <div className="space-y-4 p-3 md:p-4 lg:p-6 border rounded-lg bg-card">
              <h3 className="text-base md:text-lg lg:text-xl font-headline font-semibold text-primary">Exam Details</h3>
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
                  <FormControl><Textarea placeholder="Briefly describe the exam" {...field} value={field.value ?? ""} /></FormControl>
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
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 60"
                      {...field}
                      value={field.value ?? ""}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          field.onChange(undefined);
                        } else {
                          const parsed = parseInt(val, 10);
                          field.onChange(isNaN(parsed) ? undefined : parsed);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base md:text-lg lg:text-xl font-headline font-semibold text-primary">Questions</h3>
              {questionFields.map((questionItem, questionIndex) => (
                <Card key={questionItem.id} className="p-3 md:p-4 space-y-3 bg-muted/50">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm md:text-base lg:text-lg font-medium">Question {questionIndex + 1}</h4>
                    {questionFields.length > 1 && (
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeQuestion(questionIndex)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove Question
                      </Button>
                    )}
                  </div>
                  <FormField control={form.control} name={`questions.${questionIndex}.text`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl><Textarea placeholder="Enter question text" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`questions.${questionIndex}.type`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value !== 'MULTIPLE_CHOICE') {
                              form.setValue(`questions.${questionIndex}.options`, []);
                              form.setValue(`questions.${questionIndex}.correctAnswer`, undefined);
                            } else {
                              const currentOptions = form.getValues(`questions.${questionIndex}.options`);
                              if (!currentOptions || currentOptions.length === 0) {
                                form.setValue(`questions.${questionIndex}.options`, [
                                  { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" },
                                  { id: `opt_${Math.random().toString(36).substr(2, 9)}`, text: "" },
                                ]);
                              }
                            }
                          }}
                          defaultValue={field.value}
                        >
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
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 10"
                            {...field}
                            value={field.value ?? ""}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "") {
                                field.onChange(undefined);
                              } else {
                                const parsed = parseInt(val, 10);
                                field.onChange(isNaN(parsed) ? undefined : parsed);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <QuestionOptions
                    control={form.control}
                    questionIndex={questionIndex}
                    questionType={form.watch(`questions.${questionIndex}.type`)}
                  />

                  {(form.watch(`questions.${questionIndex}.type`) === 'SHORT_ANSWER') && (
                     <FormField control={form.control} name={`questions.${questionIndex}.correctAnswer`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Answer (Optional)</FormLabel>
                          <FormControl><Input placeholder="Expected short answer" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  )}
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={addQuestion} className="border-dashed border-primary text-primary text-xs md:text-sm">
                <PlusCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> Add Another Question
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
              {isLoading ? (<Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />) : (<Save className="mr-2 h-4 w-4 md:h-5 md:w-5" />)}
              {isLoading ? "Saving Exam..." : "Save Exam"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
