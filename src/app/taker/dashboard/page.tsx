
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History, CheckSquare, BarChart3 } from "lucide-react"; // Or other relevant icons

export default function TakerDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
        Taker Dashboard
      </h1>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">My Exam History</CardTitle>
            <History className="h-7 w-7 md:h-8 md:w-8 text-accent" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm md:text-base">
              View details and scores of exams you've completed.
            </CardDescription>
            {/* Placeholder: Add link/button to actual history page when implemented */}
            <p className="mt-4 text-sm text-muted-foreground">Feature coming soon.</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Upcoming Exams</CardTitle>
            <CheckSquare className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm md:text-base">
              Check exams you are scheduled to take.
            </CardDescription>
             {/* Placeholder: Add link/button or dynamic content */}
            <p className="mt-4 text-sm text-muted-foreground">Feature coming soon.</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl md:text-2xl font-semibold font-headline">Performance Stats</CardTitle>
            <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm md:text-base">
              Review your performance across different exams.
            </CardDescription>
             {/* Placeholder: Add link/button or dynamic content */}
            <p className="mt-4 text-sm text-muted-foreground">Feature coming soon.</p>
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
