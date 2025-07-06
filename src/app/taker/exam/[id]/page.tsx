
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getExamByIdAction } from "@/lib/actions/exam.actions";
import type { Exam } from "@/lib/types";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

const ExamTakingInterface = dynamic(() => import('@/components/taker/ExamTakingInterface').then(mod => mod.ExamTakingInterface), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading Exam Interface...</p>
    </div>
  ),
});


export default function TakeExamPage() {
  const params = useParams();
  const examId = typeof params.id === 'string' ? params.id : undefined;
  
  const [exam, setExam] = useState<Exam | null>(null);
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
        setExam(result.exam);
      } else {
        setError(result.message || "Failed to load exam details.");
        toast({ title: "Error", description: result.message || "Failed to load exam details.", variant: "destructive" });
      }
      setIsLoading(false);
    }
    fetchExamDetails();
  }, [examId, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading exam...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Could not load exam.</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  if (!exam) {
    // This case should ideally be covered by error state, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))]">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-muted-foreground">Exam not found.</p>
      </div>
    );
  }

  return <ExamTakingInterface exam={exam} />;
}
