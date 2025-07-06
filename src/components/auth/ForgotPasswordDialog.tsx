
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
import { sendOtpAction, signInWithOtpAction } from "@/lib/actions/password.actions";
import { Role } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

interface OtpSignInDialogProps {
  role: Role;
}

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});


export function OtpSignInDialog({ role }: OtpSignInDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();
  const { login } = useAuth();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const handleSendOtp = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    const result = await sendOtpAction(values.email, role);
    if (result.success) {
      toast({
        title: "OTP Request Successful",
        description: result.message,
      });
      setUserEmail(values.email);
      setStep(2);
    } else {
      toast({
        title: "OTP Request Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleSignInWithOtp = async (values: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    const result = await signInWithOtpAction({ email: userEmail, role, ...values });
    
    if (result.success && result.userId && result.role) {
      toast({
        title: "Sign In Successful",
        description: result.message,
      });
      login(result.role as Role, result.userId);
      setIsOpen(false);
    } else {
       toast({
        title: "Sign In Failed",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset forms and state when dialog is closed
      emailForm.reset();
      otpForm.reset();
      setStep(1);
      setUserEmail("");
    }
    setIsOpen(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" type="button" className="px-0 text-sm h-auto font-normal text-accent hover:underline">
          Sign in with OTP?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In with OTP</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Enter your email to receive a One-Time Password (OTP)."
              : `Enter the OTP sent to ${userEmail} to sign in.`}
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
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleSignInWithOtp)} className="space-y-4">
              <FormField
                control={otpForm.control}
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
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
