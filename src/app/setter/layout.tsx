
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react"; 
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SetterLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { isAiPanelOpen, setIsAiPanelOpen } = useAiPanel();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isAuthLoading && (!isAuthenticated || userRole !== "setter")) {
      router.push("/setter-sign-in");
    }
  }, [isAuthenticated, userRole, isAuthLoading, router]);

  if (isAuthLoading || !isAuthenticated || userRole !== "setter" || isMobile === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Shared content for the panel's header
  const PanelHeaderContent = () => (
    <div className="flex justify-between items-center p-4 sm:px-6 border-b shrink-0">
      <h2 className="text-xl font-headline text-primary flex items-center">
        <Sparkles className="mr-2 h-5 w-5" /> AI Question Generator
      </h2>
      <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)} aria-label="Close AI Panel">
        <X className="h-5 w-5" />
      </Button>
    </div>
  );

  // Shared content for the panel's body (form area)
  const PanelBodyContent = () => (
    <div className="p-4 sm:p-6 space-y-4 flex-grow flex flex-col overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Paste your syllabus content below. The AI will analyze it and suggest relevant exam questions.
      </p>
      <div className="flex-grow min-h-0"> {/* Ensures form takes available space and can shrink/scroll */}
        <SyllabusToQuestionsForm />
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${isAiPanelOpen && !isMobile ? 'flex-row' : 'flex-col'}`}>
      {/* AI Panel - Mobile (Top, Resizable Vertically) */}
      {isAiPanelOpen && isMobile && (
        <aside
          className="
            w-full h-[40vh] /* Initial height */
            min-h-[200px] max-h-[70vh] /* Vertical resize constraints */
            bg-card border-b border-border 
            flex flex-col 
            overflow-auto resize-y /* Enable vertical resize & scrolling */
            transition-opacity duration-300 ease-in-out
          "
        >
          <PanelHeaderContent />
          <PanelBodyContent />
        </aside>
      )}

      {/* Main Content Area */}
      <main className="overflow-y-auto flex-1 w-full">
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* AI Panel - Desktop (Right, Resizable Horizontally) */}
      {isAiPanelOpen && !isMobile && (
        <aside
          className="
            md:w-[30rem] lg:w-[35rem] xl:w-[40rem] /* Desktop widths */
            h-full 
            bg-card border-l border-border 
            flex flex-col 
            overflow-auto md:resize-x /* Enable horizontal resize & scrolling */
            md:min-w-[18rem] md:max-w-2xl 
            transition-opacity duration-300 ease-in-out
          "
        >
          <PanelHeaderContent />
          <PanelBodyContent />
        </aside>
      )}
    </div>
  );
}
