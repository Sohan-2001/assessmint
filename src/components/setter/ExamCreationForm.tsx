
"use client";

import { useState, useEffect } from "react";
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
import { Loader2, PlusCircle, Trash2, Save, ListChecks, Edit, CalendarIcon, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";


const questionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Question text cannot be empty"),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  points: z.coerce.number().min(0, "Points must be non-negative").default(0),
});

// This schema is for the form itself
export const examFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  passcode: z.string().min(4, "Passcode must be at least 4 characters long").optional(),
  durationMinutes: z.coerce.number().positive("Duration must be a positive number").optional().nullable(),
  questions: z.array(questionSchema).min(1, "An exam must have at least one question"),
  openDate: z.date().optional().nullable(),
  openTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time (HH:MM)")
    .optional()
    .nullable(),
  allowedTakerEmails: z.string().optional(), // Textarea for comma-separated emails
}).refine(data => {
    if ((data.openDate && !data.openTime) || (!data.openDate && data.openTime)) {
        return false;
    }
    return true;
}, {
    message: "Both date and time must be provided for scheduling, or neither.",
    path: ["openTime"], 
});

type ExamFormValues = z.infer<typeof examFormSchema>;
type QuestionFormValues = z.infer<typeof questionSchema>;

interface ExamCreationFormProps {
    initialData?: ExamFormValues & { openAt?: Date | null }; 
    examIdToUpdate?: string;
    onSubmitOverride?: (values: ExamFormValues, combinedOpenAt: Date | null) => Promise<void>;
}


function QuestionOptions({ control, questionIndex, questionType, form }: { control: any, questionIndex: number, questionType: QuestionFormValues['type'], form: any }) {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`
  });

  const handleAddOption = () => {
    appendOption({ id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, text: "" });
  };

  if (questionType !== 'MULTIPLE_CHOICE') {
    return null;
  }

  return (
    <div className="pl-2 md:pl-4 border-l-2 border-primary/50 space-y-2 mt-2">
      <h5 className="text-sm md:text-base font-medium">Options</h5>
      {optionFields.map((optionItem, optionIndex) => (
         <div key={optionItem.id || `option-${questionIndex}-${optionIndex}`} className="flex items-center gap-2">
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


export function ExamCreationForm({ initialData, examIdToUpdate, onSubmitOverride }: ExamCreationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth();
  const isEditMode = !!initialData && !!examIdToUpdate;

  const defaultQuestionValues = {
    id: `new_q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    text: "",
    type: "MULTIPLE_CHOICE" as QuestionFormValues['type'],
    points: 10,
    options: [
        { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}a`, text: "" },
        { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}b`, text: "" }
    ],
    correctAnswer: undefined,
  };

  const mapInitialDataToForm = (data: ExamCreationFormProps['initialData']): ExamFormValues => {
    let formOpenDate: Date | null = null;
    let formOpenTime: string | null = null;

    if (data?.openAt) {
      const openAtDate = new Date(data.openAt);
      formOpenDate = openAtDate;
      formOpenTime = format(openAtDate, "HH:mm");
    }
    
    return {
        title: data?.title || "",
        description: data?.description || "",
        passcode: data?.passcode || "",
        durationMinutes: data?.durationMinutes ?? null,
        questions: data?.questions?.length ? data.questions.map(q => ({
          ...q,
          correctAnswer: q.correctAnswer ?? undefined 
        })) : [defaultQuestionValues],
        openDate: formOpenDate,
        openTime: formOpenTime,
        allowedTakerEmails: data?.allowedTakerEmails || "", // Initialize from initialData
    };
  };
  
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: initialData ? mapInitialDataToForm(initialData) : {
      title: "",
      description: "",
      passcode: "",
      durationMinutes: null,
      questions: [defaultQuestionValues],
      openDate: null,
      openTime: null,
      allowedTakerEmails: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(mapInitialDataToForm(initialData));
    } else {
      form.reset({
        title: "",
        description: "",
        passcode: "",
        durationMinutes: null,
        questions: [defaultQuestionValues],
        openDate: null,
        openTime: null,
        allowedTakerEmails: "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset]);


  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const addQuestion = () => {
    appendQuestion({
        id: `new_q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: "",
        type: "MULTIPLE_CHOICE" as QuestionFormValues['type'],
        points: 10,
        options: [
            { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}c`, text: "" },
            { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}d`, text: "" }
        ],
        correctAnswer: undefined,
    });
  };


  async function onSubmit(values: ExamFormValues) {
    setIsSubmitting(true);

    let combinedOpenAt: Date | null = null;
    if (values.openDate && values.openTime) {
        try {
            const [hours, minutes] = values.openTime.split(':').map(Number);
            const dateWithTime = new Date(values.openDate);
            dateWithTime.setHours(hours, minutes, 0, 0); 
            combinedOpenAt = dateWithTime;
        } catch (e) {
            toast({ title: "Error", description: "Invalid date/time for scheduling.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    }


    if (onSubmitOverride && examIdToUpdate) {
        await onSubmitOverride(values, combinedOpenAt); 
    } else {
        if (isAuthLoading || !userId) {
            toast({ title: "Authentication Error", description: "User not authenticated or still loading. Cannot create exam.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        if (!values.passcode || values.passcode.trim() === "") {
            form.setError("passcode", { type: "manual", message: "Passcode is required to create an exam." });
            toast({ title: "Error", description: "Passcode is required.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const examDataForCreation = {
            ...values, 
            setterId: userId, 
            openAt: combinedOpenAt,
            allowedTakerEmails: values.allowedTakerEmails || "", // Pass as string
        };
        
        const { openDate, openTime, ...payloadForAction } = examDataForCreation;


        try {
          const result = await createExamAction(payloadForAction);
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
        }
    }
    setIsSubmitting(false);
  }

  return (
    <Card className="w-full mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-headline text-primary flex items-center">
          {isEditMode ? <Edit className="mr-2 h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" /> : <ListChecks className="mr-2 h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />}
          {isEditMode ? "Edit Exam" : "Create New Exam"}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm lg:text-base">
          {isEditMode ? "Modify the details of your exam below." : "Fill in the details below to create your exam. You can add multiple questions of different types."}
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
                    <FormLabel>Access Passcode {isEditMode && initialData?.passcode && "(Leave blank to keep current)"}</FormLabel>
                    <FormControl><Input type="password" placeholder={isEditMode ? "Enter new or leave blank" : "e.g., exam2024"} {...field} value={field.value ?? ""} /></FormControl>
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
                      value={field.value === null || field.value === undefined ? "" : field.value} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          field.onChange(null); 
                        } else {
                          const parsed = parseInt(val, 10);
                          field.onChange(isNaN(parsed) ? null : parsed);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              </div>
            </div>

             <div className="space-y-4 p-3 md:p-4 lg:p-6 border rounded-lg bg-card">
              <h3 className="text-base md:text-lg lg:text-xl font-headline font-semibold text-primary flex items-center">
                <Users className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Allowed Takers (Optional)
              </h3>
              <FormField control={form.control} name="allowedTakerEmails" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taker Emails</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter email addresses, separated by commas or new lines. e.g., user1@example.com, user2@example.com" 
                      {...field} 
                      value={field.value ?? ""}
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    If you provide emails, only these users can access the exam. Leave blank to allow any registered taker with the passcode.
                  </p>
                </FormItem>
              )} />
            </div>


            <div className="space-y-4 p-3 md:p-4 lg:p-6 border rounded-lg bg-card">
                 <h3 className="text-base md:text-lg lg:text-xl font-headline font-semibold text-primary">Scheduling (Optional)</h3>
                 <div className="grid md:grid-cols-2 gap-4 items-end">
                    <FormField
                        control={form.control}
                        name="openDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Opening Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value ?? undefined}
                                    onSelect={(date) => field.onChange(date ?? null)}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } 
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="openTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Opening Time (HH:MM)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="time" 
                                        placeholder="e.g., 09:30" 
                                        {...field} 
                                        value={field.value ?? ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <p className="text-xs text-muted-foreground">If both date and time are set, the exam will only be accessible after this specific time.</p>
            </div>


            <div className="space-y-4">
              <h3 className="text-base md:text-lg lg:text-xl font-headline font-semibold text-primary">Questions</h3>
              {questionFields.map((questionItem, questionIndex) => (
                <Card key={questionItem.id || `question-${questionIndex}`} className="p-3 md:p-4 space-y-3 bg-muted/50">
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
                                  { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}e`, text: "" },
                                  { id: `new_opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}f`, text: "" },
                                ]);
                              }
                            }
                          }}
                          value={field.value}
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
                                field.onChange(0); 
                              } else {
                                const parsed = parseInt(val, 10);
                                field.onChange(isNaN(parsed) ? 0 : parsed);
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
                    form={form}
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
            <Button type="submit" disabled={isSubmitting || isAuthLoading} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
              {isSubmitting ? (<Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />) : (isEditMode ? <Edit className="mr-2 h-4 w-4 md:h-5 md:w-5" /> : <Save className="mr-2 h-4 w-4 md:h-5 md:w-5" />)}
              {isSubmitting ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update Exam" : "Save Exam")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
