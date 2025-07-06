
"use client";

import type { Exam } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, ListChecks, AlertCircle } from "lucide-react"; // Added AlertCircle
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { memo } from 'react';

type ExamCardProps = {
  exam: Exam;
  onAccessExam: (examId: string) => void;
};

const ExamCardComponent = ({ exam, onAccessExam }: ExamCardProps) => {
  const isScheduled = exam.openAt && isFuture(new Date(exam.openAt));
  const examNotYetOpen = isScheduled && new Date() < new Date(exam.openAt as Date);

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-headline text-primary flex items-center">
            <ListChecks className="mr-2 h-5 w-5 md:h-6 md:w-6 text-primary" />
            {exam.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 text-sm md:text-base">{exam.description || "No description available."}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>{exam.questions.length} Questions</span>
        </div>
        {exam.durationMinutes && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>{exam.durationMinutes} minutes</span>
          </div>
        )}
        {exam.openAt && (
           <div className={`flex items-center text-sm ${examNotYetOpen ? 'text-orange-600' : 'text-muted-foreground'}`}>
            <Clock className="mr-2 h-4 w-4" />
            <span>
              {examNotYetOpen ? "Opens: " : "Opened: "} 
              {format(new Date(exam.openAt), "MMM d, yyyy 'at' HH:mm")}
            </span>
          </div>
        )}
         <p className="text-xs text-muted-foreground pt-2">
          Created {formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onAccessExam(exam.id)} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base"
          disabled={examNotYetOpen}
        >
          {examNotYetOpen ? (
            <>
              <AlertCircle className="mr-2 h-4 w-4" />
              Scheduled
            </>
          ) : "Access Exam"}
        </Button>
      </CardFooter>
      {examNotYetOpen && (
        <p className="px-6 pb-4 text-xs text-center text-orange-600">
            This exam is scheduled to open on {format(new Date(exam.openAt as Date), "MMM d")} at {format(new Date(exam.openAt as Date), "HH:mm")}.
        </p>
      )}
    </Card>
  );
}

export const ExamCard = memo(ExamCardComponent);
ExamCard.displayName = "ExamCard";
