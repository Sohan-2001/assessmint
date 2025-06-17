
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSubmissionDetailsForEvaluationAction, saveEvaluationAction } from "@/lib/actions/exam.actions";
import type { Question as AppQuestion, UserAnswer as AppUserAnswer, SubmissionForEvaluation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ArrowLeft, Save, CheckCircle, XCircle, ListChecks, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// This interface is used to manage form state for each question within the component
interface EvaluableQuestionForForm extends AppQuestion {
  awardedMarksInput: string; 
  feedbackInput: string;
}

interface SubmissionDetailsForForm extends SubmissionForEvaluation {
  questions: EvaluableQuestionForForm[];
}

export default function EvaluateSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = typeof params.submissionId === 'string' ? params.submissionId : undefined;

  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetailsForForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!submissionId) {
      setError("Submission ID is missing.");
      setIsLoading(false);
      return;
    }

    async function fetchSubmission() {
      setIsLoading(true);
      setError(null);
      const result = await getSubmissionDetailsForEvaluationAction(submissionId);
      if (result.success && result.submission) {
        const evaluableQuestions = result.submission.questions.map((q: AppQuestion) => ({
          ...q,
          userAnswer: q.userAnswer ?? (q.type === 'MULTIPLE_CHOICE' ? undefined : ""), // Ensure userAnswer is defined
          awardedMarksInput: q.awardedMarks?.toString() || "0", 
          feedbackInput: q.feedback || "",
        }));
        setSubmissionDetails({ ...result.submission, questions: evaluableQuestions });
      } else {
        setError(result.message || "Failed to load submission details.");
        toast({ title: "Error", description: result.message || "Failed to load submission details.", variant: "destructive" });
      }
      setIsLoading(false);
    }
    fetchSubmission();
  }, [submissionId, toast]);

  const handleMarkChange = (questionId: string, value: string) => {
    setSubmissionDetails(prev => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionId ? { ...q, awardedMarksInput: value } : q
        ),
      };
    });
  };
  
  const handleFeedbackChange = (questionId: string, value: string) => {
    setSubmissionDetails(prev => {
      if (!prev) return null;
      return {
        ...prev,
        questions: prev.questions.map(q => 
          q.id === questionId ? { ...q, feedbackInput: value } : q
        ),
      };
    });
  };

  const calculateTotalScore = () => {
    if (!submissionDetails) return 0;
    return submissionDetails.questions.reduce((total, q) => total + (parseFloat(q.awardedMarksInput) || 0), 0);
  };

  const calculateMaxScore = () => {
    if (!submissionDetails) return 0;
    return submissionDetails.questions.reduce((total, q) => total + q.points, 0);
  }

  const handleSaveEvaluation = async () => {
    if (!submissionDetails || !submissionId) {
      toast({ title: "Error", description: "No submission details to save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let allMarksValid = true;
    const evaluatedAnswers = submissionDetails.questions.map(q => {
      const awardedMarks = parseFloat(q.awardedMarksInput);
      if (isNaN(awardedMarks) || awardedMarks < 0 || awardedMarks > q.points) {
          toast({ 
              title: "Validation Error", 
              description: `Invalid marks for question "${q.text.substring(0,20)}...". Marks must be between 0 and ${q.points}.`, 
              variant: "destructive"
          });
          allMarksValid = false;
      }
      return {
        questionId: q.id,
        awardedMarks: awardedMarks,
        feedback: q.feedbackInput,
      };
    });

    if (!allMarksValid) {
        setIsSaving(false);
        return;
    }

    const totalScore = calculateTotalScore();

    try {
        const result = await saveEvaluationAction(submissionId, evaluatedAnswers, totalScore);
        if (result.success) {
        toast({ title: "Success", description: "Evaluation saved successfully." });
        router.push(`/setter/evaluate-exam/${submissionDetails.examId}/submissions`);
        } else {
        toast({ title: "Error", description: result.message || "Failed to save evaluation.", variant: "destructive" });
        }
    } catch (e: any) {
        toast({ title: "Error", description: e.message || "An unexpected error occurred.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading submission for evaluation...</p>
      </div>
    );
  }

  if (error || !submissionDetails) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))] text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Could not load submission.</h2>
        <p className="text-muted-foreground mb-4">{error || "Submission data not found."}</p>
        <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Go Back</Button>
      </div>
    );
  }
  
  const maxScore = calculateMaxScore();

  return (
    <div className="space-y-6 pb-10">
      <Button variant="outline" onClick={() => router.push(`/setter/evaluate-exam/${submissionDetails.examId}/submissions`)} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Submissions List
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline text-primary flex items-center">
            <ListChecks className="mr-3 h-7 w-7" />
            Evaluating: {submissionDetails.examTitle}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 pt-1">
            <User className="h-4 w-4 text-muted-foreground" />
            Student: {submissionDetails.takerEmail}
          </CardDescription>
           {submissionDetails.isEvaluated && (
            <div className="mt-2 text-sm font-semibold text-green-600 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2"/> This submission has already been evaluated. Score: {submissionDetails.evaluatedScore ?? 'N/A'} / {maxScore}.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {submissionDetails.questions.map((q, index) => (
            <Card key={q.id} className="p-4 bg-muted/30">
              <div className="mb-3">
                <p className="text-sm text-muted-foreground">Question {index + 1} (Max {q.points} points)</p>
                <p className="font-semibold text-foreground mt-1 whitespace-pre-wrap">{q.text}</p>
              </div>

              {q.type === "MULTIPLE_CHOICE" && q.options && (
                <div className="mb-3 space-y-1">
                  <Label className="text-xs text-muted-foreground">Options & Student's Choice:</Label>
                  {q.options.map(opt => {
                    const isSelectedByStudent = q.userAnswer === opt.id;
                    const isCorrectOption = q.correctAnswer === opt.id;
                    let optionStyle = "bg-card border";
                    if (isSelectedByStudent && isCorrectOption) {
                        optionStyle = "bg-green-100 border-green-400 font-semibold";
                    } else if (isSelectedByStudent && !isCorrectOption) {
                        optionStyle = "bg-red-100 border-red-400";
                    } else if (isCorrectOption) {
                         optionStyle = "bg-green-50 border-green-300";
                    }

                    return (
                        <div key={opt.id} className={`flex items-center p-2 rounded-md text-sm ${optionStyle}`}>
                        {isSelectedByStudent && isCorrectOption && <CheckCircle className="h-4 w-4 mr-2 text-green-700 shrink-0"/>}
                        {isSelectedByStudent && !isCorrectOption && <XCircle className="h-4 w-4 mr-2 text-red-700 shrink-0"/>}
                        {!isSelectedByStudent && isCorrectOption && <Info className="h-4 w-4 mr-2 text-green-600 shrink-0"/>}
                        {!isSelectedByStudent && !isCorrectOption && <span className="w-4 h-4 mr-2 shrink-0"></span>}
                        
                        <span className="mr-2">{String.fromCharCode(65 + q.options!.indexOf(opt))}.</span>
                        <span className="flex-grow">{opt.text}</span>
                        {isCorrectOption && <span className="ml-auto text-xs text-green-700 font-medium">(Correct Answer)</span>}
                        {isSelectedByStudent && !isCorrectOption && <span className="ml-auto text-xs text-red-700 font-medium">(Student's Choice)</span>}
                        </div>
                    );
                  })}
                   {!q.userAnswer && q.type === 'MULTIPLE_CHOICE' && (
                        <p className="italic text-xs text-muted-foreground/80 mt-1">No option selected by student.</p>
                    )}
                </div>
              )}

              {q.type === "SHORT_ANSWER" && q.correctAnswer && (
                 <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <Label className="text-xs text-green-700 font-medium">Suggested Correct Answer:</Label>
                    <p className="text-sm text-green-800 whitespace-pre-wrap">{q.correctAnswer}</p>
                 </div>
              )}
              
              {(q.type === "SHORT_ANSWER" || q.type === "ESSAY") && (
                <div className="mb-3 p-3 bg-card border rounded-md">
                    <Label htmlFor={`userAnswer-${q.id}`} className="text-xs text-muted-foreground">Student's Answer:</Label>
                    <div id={`userAnswer-${q.id}`} className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                        { (q.userAnswer && typeof q.userAnswer === 'string' && q.userAnswer.trim() !== "") ? q.userAnswer : 
                          (Array.isArray(q.userAnswer) && q.userAnswer.length > 0 ? q.userAnswer.join(', ') : 
                            <span className="italic text-muted-foreground/70">No answer provided</span>)
                        }
                    </div>
                </div>
              )}
              
              <Separator className="my-4"/>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                    <Label htmlFor={`marks-${q.id}`} className="text-sm font-medium">Award Marks (0 - {q.points})</Label>
                    <Input 
                        id={`marks-${q.id}`}
                        type="number"
                        min="0"
                        max={q.points}
                        value={q.awardedMarksInput}
                        onChange={(e) => handleMarkChange(q.id, e.target.value)}
                        className="mt-1 w-full md:w-32"
                        disabled={isSaving}
                    />
                    { (parseFloat(q.awardedMarksInput) < 0 || parseFloat(q.awardedMarksInput) > q.points) && 
                        <p className="text-xs text-destructive mt-1">Marks must be between 0 and {q.points}.</p>
                    }
                </div>
                <div>
                    <Label htmlFor={`feedback-${q.id}`} className="text-sm font-medium">Feedback (Optional)</Label>
                    <Textarea
                        id={`feedback-${q.id}`}
                        value={q.feedbackInput}
                        onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                        placeholder="Provide feedback for this answer..."
                        className="mt-1 min-h-[60px]"
                        disabled={isSaving}
                    />
                </div>
              </div>
            </Card>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <div className="text-lg font-bold text-primary">
                Total Evaluated Score: {calculateTotalScore()} / {maxScore}
            </div>
            <Button onClick={handleSaveEvaluation} disabled={isSaving || isLoading} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>}
                {isSaving ? "Saving..." : (submissionDetails.isEvaluated ? "Update Evaluation" : "Save Evaluation")}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


    