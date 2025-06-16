
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExamByIdAction, updateExamAction } from "@/lib/actions/exam.actions";
import type { Exam, Question as AppQuestion, QuestionOption as AppQuestionOption } from "@/lib/types"; // Using App types
import { ExamCreationForm } from "@/components/setter/ExamCreationForm";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { z } from "zod";
import type { examFormSchema } from "@/components/setter/ExamCreationForm"; // Import schema type

type ExamFormValues = z.infer<typeof examFormSchema>;


// Helper to map App Exam type to ExamFormValues
function mapAppExamToFormValues(exam: Exam): ExamFormValues {
  return {
    title: exam.title,
    description: exam.description || "",
    passcode: exam.passcode, // Passcode will be re-entered or updated
    durationMinutes: exam.durationMinutes ?? null, // Handle undefined by mapping to null for the form
    questions: exam.questions.map(q => {
      let correctAnswerForForm: string | undefined = q.correctAnswer;
      if (q.type === 'MULTIPLE_CHOICE' && q.options && q.correctAnswer) {
        // If correctAnswer is an ID, find the text. Otherwise, assume it's already text.
        const correctOpt = q.options.find(opt => opt.id === q.correctAnswer);
        correctAnswerForForm = correctOpt ? correctOpt.text : q.correctAnswer;
      }
      return {
        id: q.id,
        text: q.text,
        type: q.type,
        points: q.points,
        options: q.options?.map(opt => ({ id: opt.id, text: opt.text })) || [],
        correctAnswer: correctAnswerForForm,
      };
    }),
  };
}


export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = typeof params.id === 'string' ? params.id : undefined;
  
  const [initialExamData, setInitialExamData] = useState<ExamFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!examId) {
      setError("Exam ID is missing.");
      setIsLoading(false);
      return;
    }

    async function fetchExamDetails() {
      setIsLoading(true);
      setError(null);
      const result = await getExamByIdAction(examId as string);
      if (result.success && result.exam) {
        setInitialExamData(mapAppExamToFormValues(result.exam));
      } else {
        setError(result.message || "Failed to load exam details for editing.");
        toast({ title: "Error", description: result.message || "Failed to load exam details.", variant: "destructive" });
        router.push("/setter/manage-exams"); // Redirect if exam not found or error
      }
      setIsLoading(false);
    }
    fetchExamDetails();
  }, [examId, toast, router]);

  const handleUpdateExam = async (values: ExamFormValues) => {
    if (!examId) {
      toast({ title: "Error", description: "Exam ID is missing for update.", variant: "destructive" });
      return;
    }
    
    // The ExamCreationForm now handles its own loading state for submission
    // but we could have an outer loading state for the page if needed after submission
    const result = await updateExamAction(examId, values);
    
    if (result.success) {
      toast({ title: "Success", description: "Exam updated successfully." });
      router.push("/setter/manage-exams");
    } else {
      toast({ title: "Error", description: result.message || "Failed to update exam.", variant: "destructive" });
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading exam for editing...</p>
      </div>
    );
  }

  if (error || !initialExamData) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Could not load exam.</h2>
        <p className="text-muted-foreground mb-4">{error || "Exam data not found."}</p>
        <Button onClick={() => router.push("/setter/manage-exams")}>Back to Manage Exams</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <ExamCreationForm 
            initialData={initialExamData} 
            examIdToUpdate={examId}
            onSubmitOverride={handleUpdateExam}
        />
    </div>
  );
}
