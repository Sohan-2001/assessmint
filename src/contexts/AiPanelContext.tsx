
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState }
  from 'react';

interface AiPanelContextType {
  isAiPanelOpen: boolean;
  setIsAiPanelOpen: (isOpen: boolean) => void;
}

const AiPanelContext = createContext<AiPanelContextType | undefined>(undefined);

export const AiPanelProvider = ({ children }: { children: ReactNode }) => {
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  return (
    <AiPanelContext.Provider value={{ isAiPanelOpen, setIsAiPanelOpen }}>
      {children}
    </AiPanelContext.Provider>
  );
};

export const useAiPanel = () => {
  const context = useContext(AiPanelContext);
  if (context === undefined) {
    throw new Error('useAiPanel must be used within an AiPanelProvider');
  }
  return context;
};
