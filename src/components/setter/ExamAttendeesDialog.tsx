
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, CalendarDays, Inbox } from "lucide-react";
// Changed AttendeeInfo to the more specific type it receives
import type { getExamTakerEmailsAction } from "@/lib/actions/exam.actions"; 
import { format } from "date-fns";

type ExamAttendeesDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Update the attendees prop type to match the actual data structure being passed
  attendees: Awaited<ReturnType<typeof getExamTakerEmailsAction>>['attendees'];
  examTitle: string;
  isLoading?: boolean;
};

export function ExamAttendeesDialog({ isOpen, onOpenChange, attendees, examTitle, isLoading }: ExamAttendeesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl md:text-2xl text-primary">Attendees for: {examTitle}</DialogTitle>
          <DialogDescription>
            List of users who have submitted this exam.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] h-[300px] my-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <User className="h-8 w-8 animate-pulse text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Loading attendees...</p>
            </div>
          ) : attendees && attendees.length > 0 ? (
            <ul className="space-y-3 pr-3">
              {attendees.map((attendee, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md shadow-sm">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-primary" />
                    <span className="text-sm md:text-base text-foreground">{attendee.email}</span>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CalendarDays className="h-4 w-4 mr-1.5" />
                    {format(new Date(attendee.submittedAt), "MMM d, yyyy HH:mm")}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3" />
              <p className="text-sm md:text-base">No attendees have submitted this exam yet.</p>
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
