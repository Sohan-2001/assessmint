
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Role } from "@/lib/types";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { OtpSignInDialog } from "./ForgotPasswordDialog";

const formSchemaBase = {
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
};

const signUpSchema = z.object({
  ...formSchemaBase,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

const signInSchema = z.object(formSchemaBase);

type AuthFormProps = {
  mode: "signin" | "signup";
  role: Role;
  onSubmit: (values: z.infer<typeof signInSchema> | z.infer<typeof signUpSchema>) => Promise<void>;
  isLoading: boolean;
};

export function AuthForm({ mode, role, onSubmit, isLoading }: AuthFormProps) {
  const schema = mode === "signup" ? signUpSchema : signInSchema;
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(mode === "signup" && { confirmPassword: "" }),
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const pageTitle = mode === "signin" ? "Sign In" : "Sign Up";
  const submitButtonText = mode === "signin" ? "Sign In" : "Sign Up";
  const alternativeActionText = mode === "signin" ? "Don't have an account?" : "Already have an account?";
  const alternativeActionLink = mode === "signin" 
    ? (role === Role.SETTER ? "/setter-sign-up" : "/taker-sign-up")
    : (role === Role.SETTER ? "/setter-sign-in" : "/taker-sign-in");
  const alternativeActionLinkText = mode === "signin" ? "Sign Up" : "Sign In";

  return (
    <Card className="w-full max-w-md shadow-2xl border">
      <CardHeader>
        <CardTitle className="text-3xl font-headline text-center text-primary">{`${role === Role.SETTER ? 'Setter' : 'Taker'} ${pageTitle}`}</CardTitle>
        <CardDescription className="text-center !mt-2">
          {mode === 'signin' ? `Access your ${role.toLowerCase()} dashboard.` : `Create your ${role.toLowerCase()} account.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Password</FormLabel>
                    {mode === 'signin' && (
                        <OtpSignInDialog role={role} />
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === "signup" && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitButtonText}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {alternativeActionText}{" "}
          <Link href={alternativeActionLink} className="font-medium text-primary hover:underline">
            {alternativeActionLinkText}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
