
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getTakerExamHistoryAction } from "@/lib/actions/exam.actions";
import type { ExamHistoryInfo } from "@/lib/types";
import { Loader2, AlertTriangle, ArrowLeft, BarChart3, Star, CheckSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  yourScore: {
    label: "Your Score",
    color: "hsl(var(--primary))",
  },
  maxScore: {
    label: "Max Score",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig;

export default function PerformanceStatsPage() {
  const [history, setHistory] = useState<ExamHistoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { userId, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authIsLoading && userId) {
      const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        const result = await getTakerExamHistoryAction(userId);
        if (result.success && result.history) {
          // Filter for evaluated exams only to show meaningful stats
          setHistory(result.history.filter(item => item.isEvaluated && item.evaluatedScore !== null));
        } else {
          setError(result.message || "Failed to load your exam history for performance stats.");
          toast({ title: "Error", description: result.message || "Failed to load exam history.", variant: "destructive" });
        }
        setIsLoading(false);
      };
      fetchHistory();
    } else if (!authIsLoading && !userId) {
      setError("User not authenticated.");
      setIsLoading(false);
    }
  }, [authIsLoading, userId, toast]);

  const performanceData = useMemo(() => {
    if (history.length === 0) return { stats: null, chartData: [] };

    const chartData = history.map(item => ({
      name: item.examTitle.length > 15 ? `${item.examTitle.substring(0, 15)}...` : item.examTitle,
      yourScore: item.evaluatedScore,
      maxScore: item.maxScore,
    })).reverse(); // Show oldest exams first for a sense of progression

    const totalExamsTaken = history.length;
    const totalScore = history.reduce((acc, item) => acc + (item.evaluatedScore ?? 0), 0);
    const totalMaxScore = history.reduce((acc, item) => acc + item.maxScore, 0);
    const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const highestScoreItem = history.reduce((max, item) => ((item.evaluatedScore ?? 0) > (max.evaluatedScore ?? 0) ? item : max), history[0]);

    return {
      stats: {
        totalExamsTaken,
        averagePercentage: averagePercentage.toFixed(1),
        highestScoringExam: highestScoreItem.examTitle,
        highestScore: `${highestScoreItem.evaluatedScore}/${highestScoreItem.maxScore}`,
      },
      chartData,
    };
  }, [history]);

  if (authIsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading performance statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Could Not Load Stats</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/taker/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
          <BarChart3 className="mr-3 h-8 w-8" />
          My Performance
        </h1>
        <Button variant="outline" onClick={() => router.push('/taker/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">No performance data available yet.</p>
          <p className="text-muted-foreground">Complete some evaluated exams to see your stats here.</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exams Taken</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.stats?.totalExamsTaken}</div>
                <p className="text-xs text-muted-foreground">Total evaluated exams completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.stats?.averagePercentage}%</div>
                <p className="text-xs text-muted-foreground">Average score across all exams</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.stats?.highestScore}</div>
                <p className="text-xs text-muted-foreground truncate" title={performanceData.stats?.highestScoringExam}>
                  In: {performanceData.stats?.highestScoringExam}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Exam Scores Overview</CardTitle>
              <CardDescription>Your scores compared to the maximum possible score for each exam.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="yourScore" fill="var(--color-yourScore)" radius={4} />
                    <Bar dataKey="maxScore" fill="var(--color-maxScore)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
