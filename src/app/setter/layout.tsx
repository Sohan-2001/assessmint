
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react"; 
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { Button } from "@/components/ui/button";

// Define initial panel width classes for different breakpoints
const AI_PANEL_WIDTH_CLASSES = "w-[20rem] md:w-[30rem] lg:w-[35rem] xl:w-[40rem]";

export default function SetterLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { isAiPanelOpen, setIsAiPanelOpen } = useAiPanel();

  useEffect(() => {
    if (!isAuthLoading && (!isAuthenticated || userRole !== "setter")) {
      router.push("/setter-sign-in");
    }
  }, [isAuthenticated, userRole, isAuthLoading, router]);

  if (isAuthLoading || !isAuthenticated || userRole !== "setter") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <main className="overflow-y-auto flex-1">
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      {isAiPanelOpen && (
        <aside
          className={`
            ${AI_PANEL_WIDTH_CLASSES} 
            h-full bg-card border-l border-border
            flex flex-col
            overflow-auto 
            resize-x 
            min-w-[18rem] 
            max-w-2xl 
            transition-opacity duration-300 ease-in-out 
          `}
        >
          <div className="p-4 sm:p-6 space-y-4 flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl md:text-2xl font-headline text-primary flex items-center">
                <Sparkles className="mr-2 h-5 w-5 md:h-6 md:w-6" /> AI Question Generator
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)} aria-label="Close AI Panel">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste your syllabus content below. The AI will analyze it and suggest relevant exam questions.
            </p>
            <div className="flex-grow min-h-0"> 
                 <SyllabusToQuestionsForm />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

