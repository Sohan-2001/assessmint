
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Role } from "@/lib/types"; // Import Role enum

export default function TakerLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("TakerLayout Auth Check -> isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "userRole:", userRole);
    if (!isLoading && (!isAuthenticated || userRole !== Role.TAKER)) { // Use Role.TAKER
      console.log("TakerLayout: Redirecting to /taker-sign-in based on auth state (Role mismatch or not authenticated). Current role:", userRole);
      router.push("/taker-sign-in");
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  if (isLoading || !isAuthenticated || userRole !== Role.TAKER) { // Use Role.TAKER
    console.log("TakerLayout: Displaying Loader. isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "userRole:", userRole);
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  console.log("TakerLayout: Rendering content for authenticated taker.");
  return <div className="container mx-auto py-8 px-4 md:px-6">{children}</div>;
}
