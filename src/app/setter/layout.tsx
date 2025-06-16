
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
    <div className="flex justify-between items-center p-2 border-b shrink-0"> {/* p-3 -> p-2 */}
      <h2 className="text-base font-headline text-primary flex items-center"> {/* text-lg -> text-base */}
        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {/* mr-2 h-4 w-4 -> mr-1.5 h-3.5 w-3.5 */}
        AI Question Generator
      </h2>
      <div className="flex items-center gap-x-1">
        {isMobile && isAiPanelOpen && ( // Only show this button on mobile when panel is open
          <Button
            type="submit"
            form="syllabus-form" // ID of the form in SyllabusToQuestionsForm
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1" 
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" /> 
            Generate
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)} aria-label="Close AI Panel" className="h-7 w-7">
          <X className="h-3.5 w-3.5" /> {/* h-4 w-4 -> h-3.5 w-3.5 */}
        </Button>
      </div>
    </div>
  );

  // Shared content for the panel's body (form area)
  const PanelBodyContent = () => (
    <div className="p-2 space-y-2 flex-grow flex flex-col overflow-y-auto"> {/* p-3, space-y-3 -> p-2, space-y-2 */}
      <p className="text-xs text-muted-foreground">
        Paste your syllabus content below. The AI will analyze it and suggest relevant exam questions.
      </p>
      <div className="flex-grow min-h-0"> 
        <SyllabusToQuestionsForm />
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* AI Panel - Mobile (Top, Resizable Vertically) */}
      {isAiPanelOpen && isMobile && (
        <aside
          className="
            w-full h-[40vh] 
            min-h-[200px] max-h-[70vh] 
            bg-card border-b border-border 
            flex flex-col 
            overflow-auto resize-y 
            transition-opacity duration-300 ease-in-out
          "
        >
          <PanelHeaderContent />
          <PanelBodyContent />
        </aside>
      )}

      {/* Main Content Area */}
      <main className="overflow-y-auto flex-1 w-full">
        <div className={(isAiPanelOpen && isMobile) ? "p-2" : "p-4 sm:p-6 md:p-8"}>
          {children}
        </div>
      </main>

      {/* AI Panel - Desktop (Right, Resizable Horizontally) */}
      {isAiPanelOpen && !isMobile && (
        <aside
          className="
            md:w-[30rem] lg:w-[35rem] xl:w-[40rem] 
            h-full 
            bg-card border-l border-border 
            flex flex-col 
            overflow-auto md:resize-x 
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
