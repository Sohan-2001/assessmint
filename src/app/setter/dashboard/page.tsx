
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookText, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; 

export default function SetterDashboardPage() {
  const { userRole } = useAuth(); 

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Setter Dashboard</h1>
      
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <BookText className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              View, edit, and manage all your created exams. (Coming Soon)
            </CardDescription>
            <Button disabled className="w-full text-sm md:text-base">View Exams</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">View Results</CardTitle>
            <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4 text-sm md:text-base">
              Analyze exam performance and student submissions. (Coming Soon)
            </CardDescription>
            <Button disabled className="w-full text-sm md:text-base">Analytics</Button>
          </CardContent>
        </Card>
        
      </section>
      
      <section>
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-primary mb-4">Recent Activity</h2>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm md:text-base">No recent activity to display. Start by creating an exam!</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
