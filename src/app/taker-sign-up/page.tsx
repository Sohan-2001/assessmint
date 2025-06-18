
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import AuthPageLayout from "@/components/layout/AuthPageLayout";
import { signUpAction } from "@/lib/actions/auth.actions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState } from "react";
import { Role } from "@prisma/client"; // Import Prisma Role

// Match the schema in auth.actions.ts, though confirmPassword is only for UI validation
const signUpFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must include uppercase, lowercase, number, and special character.",
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export default function TakerSignUpPage() {
  const { login } = useAuth(); // Login context might not be directly used if not auto-logging in after signup
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (values: z.infer<typeof signUpFormSchema>) => {
    setIsLoading(true);
    const result = await signUpAction({ 
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword, // Action schema handles confirmPassword check
      role: Role.TAKER // Use Prisma Role
    });
    setIsLoading(false);
    if (result.success && result.userId) { 
      toast({ title: "Success", description: result.message });
      // router.push("/taker-sign-in"); // Redirect to sign-in after successful signup
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
