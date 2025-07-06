
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History, CheckSquare, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TakerDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
        Taker Dashboard
      </h1>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">My Exam History</CardTitle>
            <History className="h-7 w-7 md:h-8 md:w-8 text-accent" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="flex-grow mb-4 text-sm md:text-base">
              View details and scores of exams you've completed.
            </CardDescription>
            <Button asChild className="w-full mt-auto bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base">
                <Link href="/taker/history">
                    View History <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Available Exams</CardTitle>
            <CheckSquare className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="flex-grow mb-4 text-sm md:text-base">
              Check for new exams you are scheduled to take.
            </CardDescription>
            <Button asChild className="w-full mt-auto bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
                <Link href="/taker/exams">
                    Go to Exams <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Performance Stats</CardTitle>
            <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-green-600" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="flex-grow mb-4 text-sm md:text-base">
              Review your performance across different exams.
            </CardDescription>
             <Button asChild className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white text-sm md:text-base">
              <Link href="/taker/performance">
                View Stats <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl md:text-2xl font-headline font-semibold text-primary mb-4">Recent Activity</h2>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm md:text-base">No recent activity to display. Take an exam to see your progress!</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
