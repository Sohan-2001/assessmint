
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import AuthPageLayout from "@/components/layout/AuthPageLayout";
import { signInAction } from "@/lib/actions/auth.actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState } from "react";

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
    const result = await signInAction({ ...values, role: "taker" });
    setIsLoading(false);
    if (result.success && result.userId) { // Check for userId
      login("taker", result.userId); // Pass userId to login
      toast({ title: "Success", description: result.message });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <AuthPageLayout title="Taker Sign In">
      <AuthForm mode="signin" role="taker" onSubmit={handleSignIn} isLoading={isLoading} />
    </AuthPageLayout>
  );
}
