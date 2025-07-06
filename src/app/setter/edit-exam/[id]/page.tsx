
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getExamByIdAction, updateExamAction } from "@/lib/actions/exam.actions";
import type { Exam } from "@/lib/types"; 
import type { examFormSchema } from "@/components/setter/ExamCreationForm"; 
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { z } from "zod";
import { format } from "date-fns";
import dynamic from 'next/dynamic';

const ExamCreationForm = dynamic(() => import('@/components/setter/ExamCreationForm').then(mod => mod.ExamCreationForm), {
  ssr: false,
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
});

type ExamFormValues = z.infer<typeof examFormSchema>;

function mapAppExamToFormValues(exam: Exam): ExamFormValues & { openAt?: Date | null } {
  let formOpenDate: Date | null = null;
  let formOpenTime: string | null = null;

  if (exam.openAt) {
    const openAtDate = new Date(exam.openAt);
    formOpenDate = openAtDate;
    formOpenTime = format(openAtDate, "HH:mm");
  }

  return {
    title: exam.title,
    description: exam.description || "",
    passcode: exam.passcode, 
    durationMinutes: exam.durationMinutes ?? null,
    questions: exam.questions.map(q => {
      let correctAnswerForForm: string | undefined = q.correctAnswer;
      if (q.type === 'MULTIPLE_CHOICE' && q.options && q.correctAnswer) {
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
    openDate: formOpenDate,
    openTime: formOpenTime,
    // openAt is not directly part of ExamFormValues but used for mapping back from Exam type
    openAt: exam.openAt ?? null 
  };
}


export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = typeof params.id === 'string' ? params.id : undefined;
  
  // Use the extended type for initialExamData
  const [initialExamData, setInitialExamData] = useState<(ExamFormValues & { openAt?: Date | null }) | null>(null);
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
        router.push("/setter/manage-exams"); 
      }
      setIsLoading(false);
    }
    fetchExamDetails();
  }, [examId, toast, router]);

  // onSubmitOverride now receives combinedOpenAt
  const handleUpdateExam = async (formValues: ExamFormValues, combinedOpenAt: Date | null) => {
    if (!examId) {
      toast({ title: "Error", description: "Exam ID is missing for update.", variant: "destructive" });
      return;
    }
    
    // Prepare payload for updateExamAction, which expects the combined openAt
    const updatePayload = {
        ...formValues,
        openAt: combinedOpenAt, // Add the combined openAt
    };
    // Remove openDate and openTime as they are not part of the server action schema
    // @ts-ignore
    delete updatePayload.openDate; 
    // @ts-ignore
    delete updatePayload.openTime;

    const result = await updateExamAction(examId, updatePayload);
    
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
            onSubmitOverride={handleUpdateExam} // Pass the modified handler
        />
    </div>
  );
}
