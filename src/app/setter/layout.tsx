
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react"; 
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// PanelBodyContent remains a shared component for the form area
const PanelBodyContent = () => (
  <div className="p-2 space-y-2 flex-grow flex flex-col overflow-y-auto">
    <p className="text-xs text-muted-foreground">
      Paste your syllabus content below. The AI will analyze it and suggest relevant exam questions.
    </p>
    <div className="flex-grow min-h-0"> 
      <SyllabusToQuestionsForm />
    </div>
  </div>
);

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

  return (
    <div className={`flex h-screen ${isMobile ? 'flex-col' : 'md:flex-row'}`}>
      {/* Main Content Area */}
      <main className="overflow-y-auto flex-1 w-full">
        <div className={(isAiPanelOpen && isMobile) ? "p-2" : "p-4 sm:p-6 md:p-8"}>
          {children}
        </div>
      </main>

      {/* AI Panel - Mobile (Top, Resizable Vertically) */}
      {isAiPanelOpen && isMobile && (
         <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
            <SheetContent 
              side="top" 
              className="
                h-[40vh] 
                min-h-[200px] max-h-[70vh] 
                bg-card border-t border-border 
                flex flex-col 
                overflow-auto resize-y 
                p-0 
              "
              onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click for mobile top sheet
            >
              <SheetHeader className="flex flex-row justify-between items-center p-2 border-b shrink-0 sticky top-0 bg-card z-10">
                <SheetTitle className="text-base font-headline text-primary flex items-center">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Question Generator
                </SheetTitle>
                <div className="flex items-center gap-x-1">
                  <Button
                    type="submit"
                    form="syllabus-form" 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 text-xs" 
                  >
                    <Sparkles className="mr-1 h-3.5 w-3.5" /> 
                    Generate
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)} aria-label="Close AI Panel" className="h-7 w-7">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </SheetHeader>
              <PanelBodyContent />
            </SheetContent>
        </Sheet>
      )}

      {/* AI Panel - Desktop (Right, Resizable Horizontally) */}
      {isAiPanelOpen && !isMobile && (
        <aside
          className="
            md:w-[30rem] lg:w-[35rem] xl:w-[40rem] 
            md:h-full 
            bg-card md:border-l border-border 
            flex flex-col 
            overflow-auto md:resize-x 
            md:min-w-[18rem] md:max-w-2xl 
            transition-opacity duration-300 ease-in-out
          "
        >
          <div className="flex justify-between items-center p-2 border-b shrink-0 sticky top-0 bg-card z-10">
            <h2 className="text-base font-headline text-primary flex items-center">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Question Generator
            </h2>
            <div className="flex items-center gap-x-1">
              <Button variant="ghost" size="icon" onClick={() => setIsAiPanelOpen(false)} aria-label="Close AI Panel" className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <PanelBodyContent />
        </aside>
      )}
    </div>
  );
}

