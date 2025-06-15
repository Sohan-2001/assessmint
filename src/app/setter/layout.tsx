"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export default function SetterLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole !== "setter")) {
      router.push("/setter-sign-in");
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  if (isLoading || !isAuthenticated || userRole !== "setter") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <div className="container mx-auto py-8 px-4 md:px-6">{children}</div>;
}
