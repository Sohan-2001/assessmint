
"use client";

import type { Exam } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, ListChecks, Edit3, Trash2, Loader2, CalendarClock, Users } from "lucide-react"; 
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getExamAttendeesAction, type AttendeeInfo } from "@/lib/actions/exam.actions";
import { ExamAttendeesDialog } from "./ExamAttendeesDialog"; 
import { useToast } from "@/hooks/use-toast";

type ManageExamCardProps = {
  exam: Exam;
  onDelete: (examId: string) => Promise<boolean>;
};

export function ManageExamCard({ exam, onDelete }: ManageExamCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingAttendees, setIsFetchingAttendees] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeInfo[] | undefined>(undefined);
  const [isAttendeesDialogOpen, setIsAttendeesDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete(exam.id);
    setIsDeleting(false); 
  };
  
  const handleEdit = () => {
    router.push(`/setter/edit-exam/${exam.id}`);
  };

  const handleViewAttendees = async () => {
    setIsFetchingAttendees(true);
    setAttendees(undefined); // Clear previous attendees
    setIsAttendeesDialogOpen(true); // Open dialog immediately to show loading state
    const result = await getExamAttendeesAction(exam.id);
    if (result.success) {
      setAttendees(result.attendees);
    } else {
      toast({ title: "Error", description: result.message || "Could not fetch attendees.", variant: "destructive" });
      setIsAttendeesDialogOpen(false); // Close dialog on error
    }
    setIsFetchingAttendees(false);
  };

  const examNotYetOpen = exam.openAt && isFuture(new Date(exam.openAt));


  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg md:text-xl font-headline text-primary flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary shrink-0" />
              {exam.title}
          </CardTitle>
        </div>
        <CardDescription className="line-clamp-2 text-xs md:text-sm">{exam.description || "No description provided."}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-1.5 text-xs md:text-sm">
        <div className="flex items-center text-muted-foreground">
          <HelpCircle className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span>{exam.questions.length} Question{exam.questions.length === 1 ? "" : "s"}</span>
        </div>
        {exam.durationMinutes && (
          <div className="flex items-center text-muted-foreground">
            <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span>{exam.durationMinutes} minutes</span>
          </div>
        )}
        {exam.openAt && (
          <div className={`flex items-center ${examNotYetOpen ? 'text-blue-600' : 'text-muted-foreground'}`}>
            <CalendarClock className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span>
                Scheduled: {format(new Date(exam.openAt), "MMM d, HH:mm")}
                {examNotYetOpen && " (Upcoming)"}
            </span>
          </div>
        )}
         <p className="text-xs text-muted-foreground pt-1">
          Created: {formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={handleEdit} className="w-full text-xs md:text-sm">
          <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleViewAttendees} disabled={isFetchingAttendees} className="w-full text-xs md:text-sm">
          {isFetchingAttendees ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Users className="mr-1.5 h-3.5 w-3.5" />}
          Attendees
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full text-xs md:text-sm">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-lg md:text-xl">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm md:text-base">
                This action cannot be undone. This will permanently delete the exam titled "{exam.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-xs md:text-sm">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs md:text-sm"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? "Deleting..." : "Yes, delete exam"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
      {isAttendeesDialogOpen && (
        <ExamAttendeesDialog
          isOpen={isAttendeesDialogOpen}
          onOpenChange={setIsAttendeesDialogOpen}
          attendees={attendees}
          examTitle={exam.title}
          isLoading={isFetchingAttendees}
        />
      )}
    </Card>
  );
}
