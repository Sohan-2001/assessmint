
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


export default function SetterSignUpPage() {
  const { login } = useAuth(); // Login context might not be directly used if not auto-logging in after signup
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (values: z.infer<typeof signUpFormSchema>) => {
    setIsLoading(true);
    // The signUpAction expects 'role' directly, not as part of 'values' from this form schema.
    // The AuthForm component might be passing the role separately or it's implicit.
    // For this call, we ensure the role from the page context is used.
    const result = await signUpAction({ 
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword, // Action schema handles confirmPassword check
      role: Role.SETTER // Use Prisma Role
    });
    setIsLoading(false);
    if (result.success && result.userId) {
      toast({ title: "Success", description: result.message });
      // router.push("/setter-sign-in"); // Redirect to sign-in after successful signup
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <AuthPageLayout title="Setter Sign Up">
      <AuthForm mode="signup" role="setter" onSubmit={handleSignUp} isLoading={isLoading} />
    </AuthPageLayout>
  );
}
