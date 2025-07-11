"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Shield } from "lucide-react";
import Link from "next/link";

const features = [
  "Secured, custom domain for your institution.",
  "Personalised and isolated secure database.",
  "Advanced CAPTCHA verification for protection.",
  "Bespoke features tailored to your needs.",
];

export function UnlockSecurityDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-accent">
          <Shield className="mr-2 h-4 w-4" />
          Unlock Security
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary flex items-center">
            <Shield className="mr-2 h-6 w-6" />
            Unlock Premium Security
          </DialogTitle>
          <DialogDescription>
            Elevate your assessment platform with enterprise-grade security and customization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="sm:flex-col sm:items-start sm:gap-2">
           <p className="text-sm text-muted-foreground text-left">
            For more details and to get started, please contact the developer:
          </p>
          <div className="flex items-center gap-2 font-semibold">
             <Mail className="h-4 w-4 text-primary"/>
             <Link href="mailto:sohan.karfa@gmail.com" className="text-primary hover:underline">
                Sohan Karfa (sohan.karfa@gmail.com)
             </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
