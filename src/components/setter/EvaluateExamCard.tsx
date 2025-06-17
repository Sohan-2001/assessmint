
"use client";

import type { Exam } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle, ListChecks, CheckSquare, Users } from "lucide-react"; 
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";
import Link from "next/link";

type EvaluateExamCardProps = {
  exam: Exam;
};

export function EvaluateExamCard({ exam }: EvaluateExamCardProps) {
  const router = useRouter();

  const handleEvaluateSubmissions = () => {
    router.push(`/setter/evaluate-exam/${exam.id}/submissions`);
  };

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
         <p className="text-xs text-muted-foreground pt-1">
          Created: {formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true })}
        </p>
        {/* Placeholder for submission count - to be added later */}
        {/* <div className="flex items-center text-muted-foreground">
            <Users className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span>X Submissions</span> 
        </div> */}
      </CardContent>
      <CardFooter className="pt-4">
        <Button 
            onClick={handleEvaluateSubmissions} 
            className="w-full text-sm md:text-base bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckSquare className="mr-1.5 h-4 w-4" /> Evaluate Submissions
        </Button>
      </CardFooter>
    </Card>
  );
}
