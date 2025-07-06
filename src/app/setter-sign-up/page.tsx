
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import AuthPageLayout from "@/components/layout/AuthPageLayout";
import { signUpAction } from "@/lib/actions/auth.actions";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState } from "react";
import { Role } from "@/lib/types"; // Use local Role
import { useRouter } from 'next/navigation';

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (values: z.infer<typeof signUpFormSchema>) => {
    setIsLoading(true);
    const result = await signUpAction({ 
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: Role.SETTER 
    });
    setIsLoading(false);
    if (result.success && result.userId) {
      toast({ title: "Success", description: result.message });
      router.push("/setter-sign-in"); 
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <AuthPageLayout title="Setter Sign Up">
      <AuthForm mode="signup" role={Role.SETTER} onSubmit={handleSignUp} isLoading={isLoading} />
    </AuthPageLayout>
  );
}
