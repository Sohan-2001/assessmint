
"use client";

import type { ExamHistoryInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, HelpCircle, CalendarCheck2 } from "lucide-react";
import { format } from "date-fns";
import { memo } from "react";

type ExamHistoryCardProps = {
  historyItem: ExamHistoryInfo;
};

const ExamHistoryCardComponent = ({ historyItem }: ExamHistoryCardProps) => {
  const { examTitle, submittedAt, isEvaluated, evaluatedScore, maxScore } = historyItem;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <CardTitle className="text-lg md:text-xl font-headline text-primary flex items-center">
                <CalendarCheck2 className="mr-2 h-5 w-5 text-primary shrink-0" />
                {examTitle}
            </CardTitle>
            <Badge variant={isEvaluated ? "default" : "secondary"} className={`text-xs sm:text-sm whitespace-nowrap ${isEvaluated ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
                {isEvaluated ? <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> : <Clock className="mr-1.5 h-3.5 w-3.5" />}
                {isEvaluated ? "Evaluated" : "Evaluation Pending"}
            </Badge>
        </div>
        <CardDescription className="text-xs md:text-sm flex items-center pt-1">
             <Clock className="mr-1.5 h-3.5 w-3.5"/> Submitted on: {format(new Date(submittedAt), "MMM d, yyyy 'at' HH:mm")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEvaluated ? (
             <div className="flex items-center text-base font-semibold text-foreground bg-muted p-3 rounded-md">
                <HelpCircle className="mr-2 h-5 w-5 text-primary"/>
                Score: {evaluatedScore ?? "N/A"} / {maxScore}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground italic">
                Your score will be available here once the evaluation is complete.
            </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ExamHistoryCard = memo(ExamHistoryCardComponent);
ExamHistoryCard.displayName = "ExamHistoryCard";
