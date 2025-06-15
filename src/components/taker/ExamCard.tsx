"use client";

import type { Exam } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, ListChecks } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

type ExamCardProps = {
  exam: Exam;
  onAccessExam: (examId: string) => void;
};

export function ExamCard({ exam, onAccessExam }: ExamCardProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
            <ListChecks className="mr-2 h-6 w-6 text-primary" />
            {exam.title}
        </CardTitle>
        <CardDescription className="line-clamp-3">{exam.description || "No description available."}</CardDescription>
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
         <p className="text-xs text-muted-foreground pt-2">
          Created {formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onAccessExam(exam.id)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Access Exam
        </Button>
      </CardFooter>
    </Card>
  );
}
