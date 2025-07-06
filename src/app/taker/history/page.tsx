
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getTakerExamHistoryAction } from "@/lib/actions/exam.actions";
import type { ExamHistoryInfo } from "@/lib/types";
import { Loader2, AlertTriangle, History, ArrowLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamHistoryCard } from "@/components/taker/ExamHistoryCard";

export default function TakerHistoryPage() {
  const [history, setHistory] = useState<ExamHistoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { userId, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    const result = await getTakerExamHistoryAction(userId);
    if (result.success && result.history) {
      setHistory(result.history);
    } else {
      setError(result.message || "Failed to load your exam history.");
      toast({ title: "Error", description: result.message || "Failed to load exam history.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [userId, toast]);

  useEffect(() => {
    if (!authIsLoading && userId) {
      fetchHistory();
    } else if (!authIsLoading && !userId) {
      setError("User not authenticated.");
      setIsLoading(false);
    }
  }, [authIsLoading, userId, fetchHistory]);
  
  if (authIsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">Loading your exam history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold text-destructive mb-2">Could Not Load History</h2>
        <p className="text-muted-foreground mb-4 text-sm md:text-base">{error}</p>
        <Button onClick={fetchHistory} disabled={!userId} className="text-sm md:text-base">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
          <History className="mr-3 h-8 w-8" />
          My Exam History
        </h1>
        <Button variant="outline" onClick={() => router.push('/taker/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Inbox className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-base md:text-xl text-muted-foreground">
            You have not completed any exams yet.
          </p>
          <Button variant="link" asChild><a href="/taker/exams">View Available Exams</a></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <ExamHistoryCard key={item.submissionId} historyItem={item} />
          ))}
        </div>
      )}
    </div>
  );
}
