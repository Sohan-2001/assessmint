
"use client";

import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { useRouter } from "next/navigation";
import { listExamsAction, verifyPasscodeAction } from "@/lib/actions/exam.actions";
import type { Exam } from "@/lib/types";
import { ExamCard } from "@/components/taker/ExamCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Search, ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import dynamic from 'next/dynamic';

const PasscodeDialog = dynamic(() => import('@/components/taker/PasscodeDialog').then(mod => mod.PasscodeDialog), {
  ssr: false,
});


export default function AvailableExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasscodeDialogOpen, setIsPasscodeDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const { userId, isLoading: isAuthLoading } = useAuth(); // Get userId and auth loading state

  const fetchExams = useCallback(async () => {
    if (!userId && !isAuthLoading) { 
        setIsLoading(false); 
        // Optionally set an error or a message like "Please sign in to view exams"
        // For now, it will show "No exams available" if userId is null and not loading.
        setExams([]);
        setFilteredExams([]);
        return;
    }
    if (isAuthLoading) return; // Wait for auth to load

    setIsLoading(true);
    setError(null);
    const result = await listExamsAction(userId || undefined); 
    if (result.success && result.exams) {
      setExams(result.exams);
      setFilteredExams(result.exams);
    } else {
      setError(result.message || "Failed to load exams.");
      toast({ title: "Error", description: result.message || "Failed to load exams.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, userId, isAuthLoading]); 

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = exams.filter(exam => 
      exam.title.toLowerCase().includes(lowercasedFilter) ||
      exam.description?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredExams(filteredData);
  }, [searchTerm, exams]);


  const handleAccessExam = (examToAccess: Exam) => {
    if (examToAccess.openAt && new Date() < new Date(examToAccess.openAt)) {
      toast({
        title: "Exam Not Yet Open",
        description: `This exam is scheduled to open on ${format(new Date(examToAccess.openAt), "MMM d, yyyy 'at' HH:mm")}.`,
        variant: "default", 
      });
      return;
    }
    setSelectedExam(examToAccess);
    setIsPasscodeDialogOpen(true);
  };

  const handlePasscodeSubmit = async (passcode: string) => {
    if (!selectedExam || !userId) { // Ensure userId is available
        toast({ title: "Error", description: "User not authenticated or exam not selected.", variant: "destructive" });
        return false;
    }

    // Pass takerId to verifyPasscodeAction
    const result = await verifyPasscodeAction(selectedExam.id, passcode, userId);
    if (result.success) {
      if (result.examOpenAt && new Date() < new Date(result.examOpenAt)) {
        toast({
          title: "Exam Not Yet Open",
          description: `This exam will open on ${format(new Date(result.examOpenAt), "MMM d, yyyy 'at' HH:mm")}.`,
          variant: "default",
        });
        return false;
      }
      toast({ title: "Success", description: "Passcode verified. Accessing exam..." });
      router.push(`/taker/exam/${selectedExam.id}`);
      return true;
    } else {
      toast({ title: "Error", description: result.message || "Invalid passcode or access denied.", variant: "destructive" });
      return false;
    }
  };

  if (isLoading || isAuthLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">Loading available exams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
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
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Available Exams</h1>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search exams..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-10">
          <ListChecks className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-base md:text-xl text-muted-foreground">
            {searchTerm ? "No exams match your search." : (userId ? "No exams available for you at the moment, or you have completed all assigned exams. Please check back later." : "Please sign in to view available exams.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} onAccessExam={() => handleAccessExam(exam)} />
          ))}
        </div>
      )}

      {selectedExam && (
        <PasscodeDialog
          isOpen={isPasscodeDialogOpen}
          onOpenChange={setIsPasscodeDialogOpen}
          onSubmit={handlePasscodeSubmit}
          examTitle={selectedExam.title}
        />
      )}
    </div>
  );
}
