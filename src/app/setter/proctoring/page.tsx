
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Loader2, AlertTriangle, ListChecks } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { listAllExamsForSetterAction } from "@/lib/actions/exam.actions";
import type { Exam } from "@/lib/types";

const JITSI_APP_PREFIX = "AssessMintProctor";

export default function ProctoringPage() {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examsList, setExamsList] = useState<Exam[]>([]);
  const [isFetchingExams, setIsFetchingExams] = useState(true);
  const [jitsiRoomToJoin, setJitsiRoomToJoin] = useState<string | null>(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { userId, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId && !isAuthLoading) {
      setFetchError("User not authenticated. Cannot load exams for proctoring.");
      setIsFetchingExams(false);
      return;
    }
    if (isAuthLoading) return;

    async function fetchExams() {
      setIsFetchingExams(true);
      setFetchError(null);
      const result = await listAllExamsForSetterAction(userId as string);
      if (result.success && result.exams) {
        setExamsList(result.exams);
      } else {
        setFetchError(result.message || "Failed to load exams.");
        toast({ title: "Error", description: result.message || "Failed to load your exams.", variant: "destructive" });
      }
      setIsFetchingExams(false);
    }
    fetchExams();
  }, [userId, isAuthLoading, toast]);

  const handleStartProctoring = () => {
    if (!selectedExamId) {
      toast({
        title: "No Exam Selected",
        description: "Please select an exam to start proctoring.",
        variant: "destructive",
      });
      return;
    }
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "Setter ID not found. Cannot start proctoring.",
        variant: "destructive",
      });
      return;
    }
    setIsJoiningRoom(true);
    const roomName = `${JITSI_APP_PREFIX}-${selectedExamId}`;
    setJitsiRoomToJoin(roomName);
    // setIsJoiningRoom(false); // Jitsi iframe loading will be the indicator
  };

  const jitsiMeetUrl = jitsiRoomToJoin
    ? `https://meet.jit.si/${jitsiRoomToJoin}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName="Proctor-${userId || 'Admin'}"&config.prejoinPageEnabled=false&config.toolbarButtons=["microphone","camera","tileview","hangup","fullscreen"]`
    : "";

  if (isAuthLoading || isFetchingExams) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm md:text-base">
          {isAuthLoading ? "Authenticating..." : "Loading your exams..."}
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4" />
        <h2 className="text-xl md:text-2xl font-semibold text-destructive mb-2">Could Not Load Exams</h2>
        <p className="text-muted-foreground mb-4 text-sm md:text-base">{fetchError}</p>
        <Button onClick={() => window.location.reload()} className="text-sm md:text-base">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
        <Video className="mr-3 h-8 w-8" />
        Live Proctoring Sessions
      </h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-semibold">Select Exam to Proctor</CardTitle>
          <CardDescription>
            Choose an exam from the list to start a Jitsi proctoring session. All takers for this exam will join the same session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {examsList.length === 0 ? (
             <div className="text-center py-6">
                <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
                <p className="text-muted-foreground">You have not created any exams yet.</p>
                <Button variant="link" asChild><a href="/setter/create-exam">Create an Exam</a></Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-end gap-2">
              <div className="flex-grow">
                <label htmlFor="examSelect" className="text-sm font-medium text-muted-foreground">
                  Select Exam
                </label>
                <Select
                  value={selectedExamId || ""}
                  onValueChange={setSelectedExamId}
                  disabled={isJoiningRoom || !!jitsiRoomToJoin}
                >
                  <SelectTrigger id="examSelect" className="mt-1">
                    <SelectValue placeholder="Choose an exam..." />
                  </SelectTrigger>
                  <SelectContent>
                    {examsList.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleStartProctoring} 
                disabled={isJoiningRoom || !!jitsiRoomToJoin || !selectedExamId} 
                className="w-full sm:w-auto"
              >
                {isJoiningRoom ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Video className="mr-2 h-4 w-4" />
                )}
                {isJoiningRoom ? "Starting..." : "Start Proctoring Session"}
              </Button>
            </div>
          )}
           {jitsiRoomToJoin && (
            <Button variant="outline" onClick={() => { setJitsiRoomToJoin(null); setSelectedExamId(null); setIsJoiningRoom(false);}} className="mt-2">
                Proctor Another Exam
            </Button>
           )}
        </CardContent>
      </Card>

      {jitsiRoomToJoin && jitsiMeetUrl && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold">
                Proctoring: {examsList.find(e => e.id === selectedExamId)?.title || jitsiRoomToJoin}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full bg-muted rounded-md overflow-hidden">
              <iframe
                src={jitsiMeetUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="w-full h-full border-0"
                title={`Jitsi Proctoring Session: ${jitsiRoomToJoin}`}
                onLoad={() => setIsJoiningRoom(false)} 
              ></iframe>
            </div>
          </CardContent>
        </Card>
      )}
       {isJoiningRoom && !jitsiRoomToJoin && (
         <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Preparing proctoring session...</p>
         </div>
       )}
    </div>
  );
}
