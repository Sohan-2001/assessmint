
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import AuthPageLayout from "@/components/layout/AuthPageLayout";
import { signInAction } from "@/lib/actions/auth.actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState } from "react";
import { Role } from "@/lib/types"; // Use local Role

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default function TakerSignInPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    const result = await signInAction({ ...values, role: Role.TAKER }); 
    setIsLoading(false);
    if (result.success && result.userId && result.role) { 
      login(result.role as Role, result.userId);
      toast({ title: "Success", description: result.message });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <AuthPageLayout title="Taker Sign In">
      <AuthForm mode="signin" role={Role.TAKER} onSubmit={handleSignIn} isLoading={isLoading} />
    </AuthPageLayout>
  );
}
