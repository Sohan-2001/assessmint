"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { sendOtpAction, resetPasswordAction } from "@/lib/actions/password.actions";
import { Role } from "@/lib/types";

interface ForgotPasswordDialogProps {
  role: Role;
}

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

const resetSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


export function ForgotPasswordDialog({ role }: ForgotPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  const handleSendOtp = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    const result = await sendOtpAction({ email: values.email, role });
    toast({ title: "OTP Request", description: result.message });
    if (result.success) {
      setUserEmail(values.email);
      setStep(2);
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (values: z.infer<typeof resetSchema>) => {
    setIsLoading(true);
    const result = await resetPasswordAction({ email: userEmail, ...values });
    toast({
      title: "Password Reset",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (result.success) {
      setIsOpen(false);
      // Reset state for next time
      setTimeout(() => {
        setStep(1);
        setUserEmail("");
        emailForm.reset();
        resetForm.reset();
      }, 300);
    }
    setIsLoading(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset forms and state when dialog is closed
      emailForm.reset();
      resetForm.reset();
      setStep(1);
      setUserEmail("");
    }
    setIsOpen(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" type="button" className="px-0 text-sm h-auto font-normal text-accent hover:underline">
          Forgot Password?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Enter your email to receive a One-Time Password (OTP)."
              : `Enter the OTP sent to ${userEmail} and your new password.`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTP</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
