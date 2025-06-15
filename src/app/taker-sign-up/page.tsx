"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import AuthPageLayout from "@/components/layout/AuthPageLayout";
import { signUpAction } from "@/lib/actions/auth.actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState } from "react";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
});

export default function TakerSignUpPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    const result = await signUpAction({ ...values, role: "taker" });
    setIsLoading(false);
    if (result.success) {
      login("taker");
      toast({ title: "Success", description: result.message });
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <AuthPageLayout title="Taker Sign Up">
      <AuthForm mode="signup" role="taker" onSubmit={handleSignUp} isLoading={isLoading} />
    </AuthPageLayout>
  );
}
