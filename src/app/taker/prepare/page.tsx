
"use client";

import { PracticeQuestionsForm } from "@/components/taker/PracticeQuestionsForm";
import { Lightbulb } from "lucide-react";

export default function PreparePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
          <Lightbulb className="mr-3 h-8 w-8 text-amber-500" />
          Practice Question Generator
        </h1>
      </div>
      <p className="text-muted-foreground">
        Paste a syllabus or topic notes into the text area below. The AI will generate practice questions to help you prepare for your exam. Select the types of questions you'd like to see.
      </p>
      <PracticeQuestionsForm />
    </div>
  );
}
