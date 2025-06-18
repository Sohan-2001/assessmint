
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookText, ClipboardCheck, Video } from "lucide-react"; 
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; 

export default function SetterDashboardPage() {
  const { userRole } = useAuth(); 

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Setter Dashboard</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Create New Exam</CardTitle>
            <PlusCircle className="h-7 w-7 md:h-8 md:w-8 text-accent" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              Design a new exam from scratch or use existing templates.
            </CardDescription>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base">
              <Link href="/setter/create-exam">Start Creating</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Manage Exams</CardTitle>
            <BookText className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              View, edit, and delete all your created exams.
            </CardDescription>
            <Button asChild className="w-full text-sm md:text-base bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/setter/manage-exams">View Exams</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Evaluate Exams</CardTitle> 
            <ClipboardCheck className="h-7 w-7 md:h-8 md:w-8 text-green-600" /> 
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              Review student submissions and provide marks/feedback.
            </CardDescription>
            <Button asChild className="w-full text-sm md:text-base bg-green-600 hover:bg-green-700 text-white"> 
              <Link href="/setter/evaluate-exams">Start Evaluating</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Proctor</CardTitle> 
            <Video className="h-7 w-7 md:h-8 md:w-8 text-blue-600" /> 
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              Monitor exams with AI-powered proctoring features.
            </CardDescription>
            <p className="mt-4 text-sm text-muted-foreground">Feature coming soon.</p>
          </CardContent>
        </Card>
        
      </section>
      
    </div>
  );
}
