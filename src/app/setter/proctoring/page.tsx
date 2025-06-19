
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const JITSI_APP_PREFIX = "AssessMintProctor";

export default function ProctoringPage() {
  const [roomNameInput, setRoomNameInput] = useState("");
  const [jitsiRoomToJoin, setJitsiRoomToJoin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const { toast } = useToast();

  const handleJoinRoom = () => {
    if (!roomNameInput.trim()) {
      toast({
        title: "Room Name Required",
        description: "Please enter a Jitsi room name to join.",
        variant: "destructive",
      });
      return;
    }
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "Setter ID not found. Cannot join room.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    // Simple validation for the expected pattern.
    // More robust parsing of examId and takerId could be done if needed.
    if (!roomNameInput.startsWith(JITSI_APP_PREFIX + "-")) {
        toast({
            title: "Invalid Room Name Pattern",
            description: `Room name should start with '${JITSI_APP_PREFIX}-EXAM_ID-TAKER_ID'.`,
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    setJitsiRoomToJoin(roomNameInput.trim());
    // setIsLoading(false); // Jitsi iframe loading will be the indicator now
  };
  
  const jitsiMeetUrl = jitsiRoomToJoin
    ? `https://meet.jit.si/${jitsiRoomToJoin}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName="Proctor-${userId || 'Admin'}"&config.prejoinPageEnabled=false&config.toolbarButtons=["microphone","camera","tileview","hangup","fullscreen"]`
    : "";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary flex items-center">
        <Video className="mr-3 h-8 w-8" />
        Live Proctoring Sessions
      </h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-semibold">Join a Proctoring Session</CardTitle>
          <CardDescription>
            Enter the Jitsi room name for the exam session you wish to proctor. 
            The room name is typically in the format: <strong>{JITSI_APP_PREFIX}-EXAM_ID-TAKER_ID</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex-grow">
              <label htmlFor="jitsiRoomName" className="text-sm font-medium text-muted-foreground">
                Jitsi Room Name
              </label>
              <Input
                id="jitsiRoomName"
                placeholder={`${JITSI_APP_PREFIX}-examID-takerID`}
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                className="mt-1"
                disabled={isLoading || !!jitsiRoomToJoin}
              />
            </div>
            <Button onClick={handleJoinRoom} disabled={isLoading || !!jitsiRoomToJoin} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Video className="mr-2 h-4 w-4" />
              )}
              Join Proctoring Session
            </Button>
          </div>
           {jitsiRoomToJoin && (
            <Button variant="outline" onClick={() => { setJitsiRoomToJoin(null); setRoomNameInput(""); setIsLoading(false);}} className="mt-2">
                Join Another Room
            </Button>
           )}
        </CardContent>
      </Card>

      {jitsiRoomToJoin && jitsiMeetUrl && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-semibold">Proctoring: {jitsiRoomToJoin}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full bg-muted rounded-md overflow-hidden">
              <iframe
                src={jitsiMeetUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="w-full h-full border-0"
                title={`Jitsi Proctoring Session: ${jitsiRoomToJoin}`}
                onLoad={() => setIsLoading(false)} // Stop loading indicator once iframe content loads
              ></iframe>
            </div>
          </CardContent>
        </Card>
      )}
       {isLoading && !jitsiRoomToJoin && (
         <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Preparing proctoring session...</p>
         </div>
       )}
    </div>
  );
}
