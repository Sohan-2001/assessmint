
"use client";

import { useEffect, useState, useCallback } from "react";
import { listAllExamsForSetterAction } from "@/lib/actions/exam.actions"; 
import type { Exam } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Inbox, Search, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { EvaluateExamCard } from "@/components/setter/EvaluateExamCard";

export default function EvaluateExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Local loading state for fetching exams
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { userId, isLoading: authIsLoading } = useAuth();

  const fetchExamsForEvaluation = useCallback(async () => {
    // This function should only be called when userId is available.
    if (!userId) {
      // This state should ideally be handled by the useEffect logic below,
      // but as a safeguard if called directly.
      setError("User ID not available for fetching exams.");
      setIsLoading(false);
      setExams([]);
      setFilteredExams([]);
      return;
    }

    setIsLoading(true); // Set local loading to true when fetching starts
    setError(null);
    const result = await listAllExamsForSetterAction(userId);
    if (result.success && result.exams) {
      setExams(result.exams);
      setFilteredExams(result.exams);
    } else {
      setError(result.message || "Failed to load exams for evaluation.");
      toast({ title: "Error", description: result.message || "Failed to load exams.", variant: "destructive" });
      setExams([]); // Clear exams on error
      setFilteredExams([]);
    }
    setIsLoading(false); // Set local loading to false when fetching ends
  }, [toast, userId]);

  useEffect(() => {
    if (!authIsLoading && userId) {
      // Auth is done loading and we have a userId, so fetch exams.
      fetchExamsForEvaluation();
    } else if (!authIsLoading && !userId) {
      // Auth is done loading, but no userId is available.
      setError("User not authenticated. Cannot load exams for evaluation.");
      setIsLoading(false); // Ensure local loading spinner stops.
      setExams([]);
      setFilteredExams([]);
    }
    // If authIsLoading is true, the main loading spinner (isLoading || authIsLoading) will be shown.
    // No specific action needed here, as the spinner covers this initial loading phase.
  }, [authIsLoading, userId, fetchExamsForEvaluation]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = exams.filter(exam => 
      exam.title.toLowerCase().includes(lowercasedFilter) ||
      (exam.description && exam.description.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredExams(filteredData);
  }, [searchTerm, exams]);

  // Display loading spinner if either authentication is in progress or local exam fetching is in progress.
  if (authIsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">Loading exams for evaluation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold text-destructive mb-2">Oops! Something went wrong.</h2>
        <p className="text-muted-foreground mb-4 text-sm md:text-base">{error}</p>
        <Button onClick={fetchExamsForEvaluation} disabled={!userId} className="text-sm md:text-base">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
          <ClipboardCheck className="mr-3 h-8 w-8" />
          Evaluate Exam Submissions
        </h1>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search exams..."
            className="pl-10 text-sm md:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-10">
          <Inbox className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-base md:text-xl text-muted-foreground">
            {searchTerm ? "No exams match your search." : "You haven't created any exams yet, or no exams have submissions to evaluate."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <EvaluateExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}
