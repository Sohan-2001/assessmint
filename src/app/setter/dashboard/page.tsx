"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookText, BarChart3, Settings, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; // Assuming user info might be displayed

export default function SetterDashboardPage() {
  const { userRole } = useAuth(); // Example: personalize dashboard

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-headline font-bold text-primary">Setter Dashboard</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold font-headline">Create New Exam</CardTitle>
            <PlusCircle className="h-8 w-8 text-accent" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Design a new exam from scratch or use existing templates.
            </CardDescription>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/setter/create-exam">Start Creating</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold font-headline">AI Question Generator</CardTitle>
            <SparklesIcon className="h-8 w-8 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Generate questions quickly by providing a syllabus or topic.
            </CardDescription>
            <Button asChild className="w-full">
              <Link href="/setter/generate-questions">Generate Questions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold font-headline">Manage Exams</CardTitle>
            <BookText className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              View, edit, and manage all your created exams. (Coming Soon)
            </CardDescription>
            <Button disabled className="w-full">View Exams</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold font-headline">View Results</CardTitle>
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Analyze exam performance and student submissions. (Coming Soon)
            </CardDescription>
            <Button disabled className="w-full">Analytics</Button>
          </CardContent>
        </Card>
        
        {/* <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold font-headline">Account Settings</CardTitle>
            <Settings className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Update your profile and preferences.
            </CardDescription>
            <Button disabled className="w-full">Go to Settings</Button>
          </CardContent>
        </Card> */}
      </section>
      
      <section>
        <h2 className="text-2xl font-headline font-semibold text-primary mb-4">Recent Activity</h2>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No recent activity to display. Start by creating an exam!</p>
            {/* Placeholder for recent activity feed */}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
