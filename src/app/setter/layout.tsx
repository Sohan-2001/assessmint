
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext"; // Consume the context

const AI_PANEL_WIDTH_CLASS = "sm:w-[40rem]"; // e.g., 640px
const AI_PANEL_MARGIN_CLASS_LG = "lg:mr-[40rem]";

export default function SetterLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { isAiPanelOpen, setIsAiPanelOpen } = useAiPanel(); // Consume context

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
    <>
      <div 
        className={`container mx-auto py-8 px-4 md:px-6 transition-all duration-300 ease-in-out ${isAiPanelOpen ? AI_PANEL_MARGIN_CLASS_LG : 'mr-0'}`}
      >
        {children}
      </div>
      <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <SheetContent className={`overflow-y-auto p-6 w-full ${AI_PANEL_WIDTH_CLASS}`} side="right">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-headline text-primary flex items-center">
              <Sparkles className="mr-2 h-6 w-6" /> AI Question Generator
            </SheetTitle>
            <SheetDescription>
              Paste your syllabus content below. The AI will analyze it and suggest relevant exam questions.
            </SheetDescription>
          </SheetHeader>
          <SyllabusToQuestionsForm />
        </SheetContent>
      </Sheet>
    </>
  );
}
