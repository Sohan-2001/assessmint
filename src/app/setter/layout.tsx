
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react"; 
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Role } from "@/lib/types"; 

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
    console.log("SetterLayout Auth Check -> isLoading:", isAuthLoading, "isAuthenticated:", isAuthenticated, "userRole:", userRole);
    if (!isAuthLoading && (!isAuthenticated || userRole !== Role.SETTER)) { 
      console.log("SetterLayout: Redirecting to /setter-sign-in based on auth state (Role mismatch or not authenticated). Current role:", userRole);
      router.push("/setter-sign-in");
    }
  }, [isAuthenticated, userRole, isAuthLoading, router]);

  if (isAuthLoading || !isAuthenticated || userRole !== Role.SETTER || isMobile === undefined) { 
    console.log("SetterLayout: Displaying Loader. isAuthLoading:", isAuthLoading, "isAuthenticated:", isAuthenticated, "userRole:", userRole, "isMobile:", isMobile);
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  console.log("SetterLayout: Rendering content for authenticated setter.");

  return (
    <div className={`flex h-full ${isMobile ? 'flex-col' : 'flex-row'}`}> {/* Changed h-screen to h-full */}
      
      {/* AI Panel - Mobile (Top, Resizable Vertically) */}
      {isAiPanelOpen && isMobile && (
        <aside
          className="
            w-full 
            h-[40vh] 
            min-h-[200px] max-h-[70vh] 
            bg-card border-b border-border 
            flex flex-col 
            overflow-auto resize-y 
          "
        >
          {/* Mobile Panel Header */}
          <div className="flex flex-row justify-between items-center p-2 border-b shrink-0 sticky top-0 bg-card z-10">
            <h2 className="text-base font-headline text-primary flex items-center">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Question Generator
            </h2>
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
          </div>
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
            bg-card md:border-l border-border 
            flex flex-col 
            overflow-auto resize-x 
            min-w-[18rem] md:max-w-2xl 
            transition-opacity duration-300 ease-in-out
          "
        >
          {/* Desktop Panel Header */}
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
