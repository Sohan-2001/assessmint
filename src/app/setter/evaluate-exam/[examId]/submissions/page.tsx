
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } 
from "next/navigation";
import { getExamSubmissionsForEvaluationAction, getExamByIdAction } from "@/lib/actions/exam.actions";
import { autoEvaluateSubmissionAction } from "@/lib/actions/ai.actions"; // Import AI action
import type { SubmissionInfo, Exam } from "@/lib/types"; 
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Inbox, ClipboardCheck, ArrowLeft, UserCheck, Sparkles } from "lucide-react"; // Added Sparkles
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";

export default function ExamSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = typeof params.examId === 'string' ? params.examId : undefined;
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluatingSubmissionId, setEvaluatingSubmissionId] = useState<string | null>(null); // For AI eval loading
  const { toast } = useToast();

  const fetchSubmissions = useCallback(async () => {
    if (!examId) {
      setError("Exam ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const examDetailsResult = await getExamByIdAction(examId);
    if (examDetailsResult.success && examDetailsResult.exam) {
        setExam(examDetailsResult.exam);
    } else {
        setError(examDetailsResult.message || "Failed to load exam details.");
        toast({ title: "Error", description: examDetailsResult.message || "Failed to load exam details.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const result = await getExamSubmissionsForEvaluationAction(examId);
    if (result.success && result.submissions) {
      setSubmissions(result.submissions);
    } else {
      setError(result.message || "Failed to load submissions for this exam.");
    }
    setIsLoading(false);
  }, [examId, toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleAutoEvaluate = async (submissionIdToEvaluate: string) => {
    setEvaluatingSubmissionId(submissionIdToEvaluate);
    toast({ title: "AI Evaluation Started", description: "The AI is now evaluating the submission. This may take a moment."});
    const result = await autoEvaluateSubmissionAction(submissionIdToEvaluate);
    if (result.success) {
      toast({ title: "AI Evaluation Successful", description: result.message });
      fetchSubmissions(); // Refresh the list to show updated status
    } else {
      toast({ title: "AI Evaluation Failed", description: result.message, variant: "destructive" });
    }
    setEvaluatingSubmissionId(null);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold text-destructive mb-2">Oops! Something went wrong.</h2>
        <p className="text-muted-foreground mb-4 text-sm md:text-base">{error}</p>
        <Button onClick={() => router.back()} className="text-sm md:text-base mr-2">
            <ArrowLeft className="mr-2 h-4 w-4"/>Go Back
        </Button>
        <Button onClick={fetchSubmissions} className="text-sm md:text-base">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.push('/setter/evaluate-exams')} className="mb-6 text-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Evaluate Exams List
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline text-primary flex items-center">
            <ClipboardCheck className="mr-3 h-7 w-7" /> 
            Submissions for: {exam?.title || "Exam"}
          </CardTitle>
          <CardDescription>
            Review and evaluate each student's submission, or use AI to auto-evaluate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-base md:text-xl text-muted-foreground">
                No submissions received for this exam yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div 
                  key={submission.submissionId} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card gap-3 sm:gap-4"
                >
                  <div className="flex-grow">
                    <div className="flex items-center mb-1">
                        <UserCheck className="h-5 w-5 mr-2 text-primary" />
                        <p className="font-medium text-foreground text-sm md:text-base">{submission.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                     <p className={`text-xs font-medium mt-1 ${submission.isEvaluated ? 'text-green-600' : 'text-amber-600'}`}>
                        Status: {submission.isEvaluated ? `Evaluated (Score: ${submission.evaluatedScore ?? 'N/A'})` : "Pending Evaluation"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                    <Button 
                      asChild 
                      size="sm" 
                      className={`text-xs md:text-sm w-full sm:w-auto ${submission.isEvaluated ? 'bg-blue-600 hover:bg-blue-700' : 'bg-accent hover:bg-accent/90'}`}
                    >
                      <Link href={`/setter/evaluate-submission/${submission.submissionId}`}>
                        {submission.isEvaluated ? "View Evaluation" : "Check Submission"}
                      </Link>
                    </Button>
                    {!submission.isEvaluated && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs md:text-sm w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
                        onClick={() => handleAutoEvaluate(submission.submissionId)}
                        disabled={evaluatingSubmissionId === submission.submissionId}
                      >
                        {evaluatingSubmissionId === submission.submissionId ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-4 w-4" />
                        )}
                        {evaluatingSubmissionId === submission.submissionId ? "AI Evaluating..." : "Auto-Evaluate"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
