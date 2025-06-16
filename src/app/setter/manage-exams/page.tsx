
"use client";

import { useEffect, useState, useCallback } from "react";
import { listExamsAction, deleteExamAction } from "@/lib/actions/exam.actions";
import type { Exam } from "@/lib/types";
import { ManageExamCard } from "@/components/setter/ManageExamCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ManageExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listExamsAction();
    if (result.success && result.exams) {
      setExams(result.exams);
      setFilteredExams(result.exams);
    } else {
      setError(result.message || "Failed to load exams.");
      toast({ title: "Error", description: result.message || "Failed to load exams.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = exams.filter(exam => 
      exam.title.toLowerCase().includes(lowercasedFilter) ||
      (exam.description && exam.description.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredExams(filteredData);
  }, [searchTerm, exams]);

  const handleDeleteExam = async (examId: string) => {
    const result = await deleteExamAction(examId);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      fetchExams(); // Re-fetch exams to update the list
    } else {
      toast({ title: "Error", description: result.message || "Failed to delete exam.", variant: "destructive" });
    }
    return result.success;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">Loading your exams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold text-destructive mb-2">Oops! Something went wrong.</h2>
        <p className="text-muted-foreground mb-4 text-sm md:text-base">{error}</p>
        <Button onClick={fetchExams} className="text-sm md:text-base">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Manage Your Exams</h1>
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
            {searchTerm ? "No exams match your search." : "You haven't created any exams yet. Get started by creating one!"}
          </p>
          {/* Optionally, add a "Create Exam" button here if exams list is empty and no search term */}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <ManageExamCard key={exam.id} exam={exam} onDelete={handleDeleteExam} />
          ))}
        </div>
      )}
    </div>
  );
}
