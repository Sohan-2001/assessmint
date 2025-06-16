
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, Sparkles, X } from "lucide-react"; // Added X for close button
import { SyllabusToQuestionsForm } from "@/components/setter/SyllabusToQuestionsForm";
import { useAiPanel } from "@/contexts/AiPanelContext";
import { Button } from "@/components/ui/button";

// Define panel width classes for different breakpoints
// On small screens (default), it takes full width, effectively replacing main content.
// On md and larger, it takes a fixed width for side-by-side view.
const AI_PANEL_WIDTH_CLASSES = "w-full md:w-[30rem] lg:w-[35rem] xl:w-[40rem]";

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
    // This div takes the height provided by RootLayout's <main class="flex-grow">
    // and arranges main content and AI panel horizontally.
    <div className="flex h-full overflow-hidden"> {/* Added overflow-hidden for safety */}
      {/* Main content area: Takes remaining space and scrolls independently */}
      {/* Hide main content visually if panel is full-width on small screens */}
      <main className={`flex-1 overflow-y-auto ${isAiPanelOpen && AI_PANEL_WIDTH_CLASSES.startsWith('w-full') ? 'md:block' : 'block'} ${isAiPanelOpen && AI_PANEL_WIDTH_CLASSES.startsWith('w-full') && !AI_PANEL_WIDTH_CLASSES.includes('md:w-') ? 'hidden' : 'block' }`}>
        <div className="p-4 sm:p-6 md:p-8"> {/* Padding for the content area */}
          {children}
        </div>
      </main>

      {/* AI Panel: Conditionally rendered, fixed/full width, scrolls independently */}
      {isAiPanelOpen && (
        <aside
          className={`
            ${AI_PANEL_WIDTH_CLASSES}
            h-full bg-card border-l border-border shadow-xl
            flex flex-col overflow-y-auto
            transition-all duration-300 ease-in-out 
          `}
        >
          {/* Panel Content Wrapper with Padding */}
          <div className="p-4 sm:p-6 space-y-4 flex-grow flex flex-col"> {/* Consistent padding */}
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
            <div className="flex-grow min-h-0"> {/* Added min-h-0 to ensure flex-grow works correctly with scrollable children */}
                 <SyllabusToQuestionsForm />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
