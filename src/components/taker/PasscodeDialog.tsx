"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PasscodeDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (passcode: string) => Promise<boolean>; // Returns true if passcode is correct
  examTitle: string;
};

export function PasscodeDialog({ isOpen, onOpenChange, onSubmit, examTitle }: PasscodeDialogProps) {
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!passcode.trim()) {
      toast({ title: "Error", description: "Passcode cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const success = await onSubmit(passcode);
    setIsLoading(false);
    if (success) {
      onOpenChange(false); // Close dialog on success
      setPasscode(""); // Reset passcode
    } else {
        // Error toast is handled by the calling component typically
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <KeyRound className="mr-2 h-6 w-6" /> Enter Passcode
          </DialogTitle>
          <DialogDescription>
            Enter the passcode to access the exam: <strong>{examTitle}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter exam passcode"
            className="text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Passcode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
