
"use client";

import type { Exam, Question as QuestionType, UserAnswer } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; 
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { submitExamAnswersAction } from "@/lib/actions/exam.actions";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, FileQuestion, Loader2, Send, PauseOctagon, Play, AlertTriangle, ScreenShare, Video } from "lucide-react"; // Added Video
import { useAuth } from "@/contexts/AuthContext"; 

type ExamTakingInterfaceProps = {
  exam: Exam;
};

interface SavedExamState {
  answers: UserAnswer[];
  currentQuestionIndex: number;
  timeLeft: number | null;
  isPaused: boolean;
  examStarted: boolean;
  jitsiRoomName?: string;
}

const getLocalStorageKey = (examId: string) => `assessMint_exam_progress_${examId}`;
const JITSI_APP_PREFIX = "AssessMintProctor";

export function ExamTakingInterface({ exam }: ExamTakingInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>(() => 
    exam.questions.map(q => ({ questionId: q.id, answer: "" })) 
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(exam.durationMinutes ? exam.durationMinutes * 60 : null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [forceSubmitted, setForceSubmitted] = useState(false);
  const examInterfaceRef = useRef<HTMLDivElement>(null);
  const [jitsiRoomName, setJitsiRoomName] = useState<string | null>(null);
  const [showJitsi, setShowJitsi] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { userId, isLoading: isAuthLoading } = useAuth(); 

  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

  const saveStateToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined' && exam.id) {
      const stateToSave: SavedExamState = {
        answers,
        currentQuestionIndex,
        timeLeft,
        isPaused,
        examStarted,
        jitsiRoomName: jitsiRoomName || undefined,
      };
      localStorage.setItem(getLocalStorageKey(exam.id), JSON.stringify(stateToSave));
    }
  }, [answers, currentQuestionIndex, timeLeft, isPaused, examStarted, exam.id, jitsiRoomName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && exam.id) {
      const savedStateRaw = localStorage.getItem(getLocalStorageKey(exam.id));
      if (savedStateRaw) {
        try {
          const savedState: SavedExamState = JSON.parse(savedStateRaw);
          setAnswers(savedState.answers);
          setCurrentQuestionIndex(savedState.currentQuestionIndex);
          setTimeLeft(savedState.timeLeft);
          setIsPaused(savedState.isPaused);
          setExamStarted(savedState.examStarted);
          if (savedState.jitsiRoomName) {
            setJitsiRoomName(savedState.jitsiRoomName);
            setShowJitsi(savedState.examStarted); // Show Jitsi if exam was started
          }
          if (savedState.examStarted && !document.fullscreenElement && examInterfaceRef.current) {
            // Potentially handle re-entering fullscreen or auto-submitting based on policy
          }
          toast({ title: "Exam Resumed", description: "Your previous progress has been loaded."});
        } catch (error) {
          console.error("Error loading saved exam state:", error);
          localStorage.removeItem(getLocalStorageKey(exam.id)); 
        }
      }
      setIsLoadedFromStorage(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]); 


  useEffect(() => {
    if (isLoadedFromStorage) { 
        saveStateToLocalStorage();
    }
  }, [answers, currentQuestionIndex, timeLeft, isPaused, examStarted, jitsiRoomName, saveStateToLocalStorage, isLoadedFromStorage]);


  const handleSubmit = useCallback(async (autoSubmit: boolean = false, reason?: string) => {
    if (forceSubmitted || isLoading || !userId) { 
        if (!userId) toast({title: "Error", description: "User not authenticated. Cannot submit.", variant: "destructive"});
        return;
    }
    if (autoSubmit) {
        setForceSubmitted(true);
    }
    setIsLoading(true);

    if (document.fullscreenElement) {
        try {
            await document.exitFullscreen();
        } catch (err) {
            console.error("Could not exit fullscreen:", err);
        }
    }
    setShowJitsi(false); 

    const result = await submitExamAnswersAction({ examId: exam.id, takerId: userId, answers });
    setIsLoading(false);
    if (result.success) {
      toast({ title: reason ? "Exam Submitted" : "Exam Submitted!", description: reason || result.message || "Your answers have been recorded." });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getLocalStorageKey(exam.id));
      }
      router.push(`/taker/exams?submission=${result.submissionId}`); 
    } else {
      toast({ title: "Submission Failed", description: result.message || "Could not submit your answers.", variant: "destructive" });
      setForceSubmitted(false);
      setShowJitsi(examStarted); // Re-show Jitsi if submission failed and exam was started
    }
    if (autoSubmit && timeLeft === 0 && !reason) { 
        toast({ title: "Time's Up!", description: "Your exam has been automatically submitted.", variant: "default" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, answers, router, toast, forceSubmitted, isLoading, timeLeft, userId, examStarted]);


  useEffect(() => {
    if (!examStarted || isPaused || !isLoadedFromStorage || forceSubmitted || isLoading) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isPaused && !forceSubmitted && !isLoading) {
        handleSubmit(true, "Exited fullscreen mode");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused && !forceSubmitted && !isLoading) {
        handleSubmit(true, "Switched browser tab or window");
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examStarted, isPaused, forceSubmitted, isLoading, handleSubmit, isLoadedFromStorage]);


  useEffect(() => {
    if (isPaused || !isLoadedFromStorage || timeLeft === null || !examStarted || forceSubmitted) return;

    if (timeLeft === 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, isLoadedFromStorage, examStarted, handleSubmit, forceSubmitted]); 

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "No time limit";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answerValue: string | string[]) => {
    if (forceSubmitted) return;
    setAnswers(prevAnswers =>
      prevAnswers.map(ans =>
        ans.questionId === questionId ? { ...ans, answer: answerValue } : ans
      )
    );
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1); 
    }
  };

  const togglePause = () => {
    if (!examStarted || forceSubmitted) return;
    setIsPaused(!isPaused);
    if (!isPaused) { 
      toast({ title: "Exam Resumed"});
      setShowJitsi(true);
    } else { 
      saveStateToLocalStorage(); 
      toast({ title: "Exam Paused", description: "Your progress is saved. You can resume when ready."});
      setShowJitsi(false);
    }
  };

  const handleStartExam = async () => {
    if (examInterfaceRef.current && userId) {
      try {
        await examInterfaceRef.current.requestFullscreen();
        setExamStarted(true);
        const room = `${JITSI_APP_PREFIX}-${exam.id}-${userId}`;
        setJitsiRoomName(room);
        setShowJitsi(true);
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
        toast({
          title: "Fullscreen Required",
          description: "Could not enter fullscreen mode. Please enable fullscreen for this site to start the exam.",
          variant: "destructive",
        });
      }
    } else if (!userId) {
        toast({
          title: "Authentication Error",
          description: "Cannot start exam, user ID not found.",
          variant: "destructive",
        });
    }
  };


  const renderQuestionInput = (question: QuestionType) => {
    const currentAnswerObj = answers.find(a => a.questionId === question.id);
    const currentAnswerValue = currentAnswerObj ? currentAnswerObj.answer : "";

    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <RadioGroup
            value={currentAnswerValue as string} 
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-3"
            disabled={isPaused || forceSubmitted || isLoading}
          >
            {question.options?.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted transition-colors">
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={isPaused || forceSubmitted || isLoading}/>
                <Label htmlFor={`${question.id}-${option.id}`} className="text-sm md:text-base cursor-pointer flex-grow">{option.text}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'SHORT_ANSWER':
        return (
          <Input
            value={currentAnswerValue as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your short answer here"
            disabled={isPaused || forceSubmitted || isLoading}
          />
        );
      case 'ESSAY':
        return (
          <Textarea
            value={currentAnswerValue as string}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your essay here"
            className="min-h-[150px]"
            disabled={isPaused || forceSubmitted || isLoading}
          />
        );
      default:
        return <p>Unsupported question type: {question.type}</p>;
    }
  };

  if (!isLoadedFromStorage || isAuthLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,8rem))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading exam state...</p>
      </div>
    );
  }
  
  if (!examStarted) {
    return (
      <div ref={examInterfaceRef} className="max-w-3xl mx-auto py-10">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-headline text-primary flex items-center">
              <ScreenShare className="mr-3 h-7 w-7" /> Ready to Start: {exam.title}
            </CardTitle>
            <CardDescription className="text-sm md:text-base pt-1">
              {exam.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-l-4 border-destructive bg-destructive/10 rounded-md">
              <h3 className="font-semibold text-destructive flex items-center mb-2">
                <AlertTriangle className="mr-2 h-5 w-5" /> Important Instructions
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-destructive/90">
                <li>This exam must be taken in fullscreen mode.</li>
                <li>Manual proctoring via video call may be active.</li>
                <li>Exiting fullscreen will automatically submit your exam.</li>
                <li>Switching to another browser tab or window will automatically submit your exam.</li>
                <li>Ensure you have a stable internet connection.</li>
                {exam.durationMinutes && <li>You will have <strong>{exam.durationMinutes} minutes</strong> to complete the exam once started.</li>}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Click the button below to start the exam in fullscreen. Your camera and microphone may be requested for proctoring.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartExam} size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base md:text-lg" disabled={!userId}>
              {!userId ? "Authenticating..." : "Start Exam in Fullscreen"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const jitsiMeetUrl = jitsiRoomName 
  ? `https://meet.jit.si/${jitsiRoomName}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName="Taker-${userId || 'Guest'}"&config.prejoinPageEnabled=false&config.toolbarButtons=["microphone","camera","tileview","hangup"]`
  : "";


  return (
    <div ref={examInterfaceRef} className="max-w-3xl mx-auto bg-background relative"> 
      {showJitsi && jitsiMeetUrl && (
        <div className="fixed bottom-4 right-4 w-64 h-48 z-50 shadow-2xl rounded-lg overflow-hidden border-2 border-primary bg-black">
          <iframe
            src={jitsiMeetUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full"
            title="Jitsi Proctoring"
          ></iframe>
        </div>
      )}
      <Card className="shadow-xl min-h-screen flex flex-col"> 
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0">
            <CardTitle className="text-2xl md:text-3xl font-headline text-primary">{exam.title}</CardTitle>
            <div className="flex items-center gap-2">
              {timeLeft !== null && (
                <div className={`flex items-center font-semibold p-2 rounded-md text-sm md:text-base ${timeLeft <= 300 && !isPaused && !forceSubmitted ? 'text-destructive animate-pulse' : 'text-primary'} bg-primary/10`}>
                  <Clock className="mr-2 h-4 w-4 md:h-5 md:w-5" /> {isPaused ? 'Paused' : (forceSubmitted ? 'Submitting...' : formatTime(timeLeft))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={togglePause} disabled={isLoading || forceSubmitted} className="text-sm md:text-base">
                {isPaused ? <Play className="mr-1.5 h-4 w-4" /> : <PauseOctagon className="mr-1.5 h-4 w-4" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm md:text-base pt-1">{exam.description}</CardDescription>
        </CardHeader>

        {isPaused ? (
          <CardContent className="flex-grow flex flex-col items-center justify-center py-10 px-4 md:px-6 text-center">
            <PauseOctagon className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Exam Paused</h2>
            <p className="text-muted-foreground mb-6">Your progress is saved. Click "Resume" to continue.</p>
            <Button onClick={togglePause} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
              <Play className="mr-2 h-5 w-5" /> Resume Exam
            </Button>
          </CardContent>
        ) : (
          <>
            <CardContent className="flex-grow py-6 px-4 md:px-6 space-y-6">
              <div className="space-y-1">
                <div className="flex justify-between text-xs md:text-sm text-muted-foreground mb-1">
                  <span>Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
                  <span>Points: {currentQuestion.points}</span>
                </div>
                <Progress value={progress} className="w-full h-2" />
              </div>
              
              <Card className="bg-muted/30 p-4 md:p-6 rounded-lg">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 flex items-start">
                  <FileQuestion className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 text-accent shrink-0 mt-1" /> 
                  {currentQuestion.text}
                </h3>
                {renderQuestionInput(currentQuestion)}
              </Card>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-6 mt-auto"> 
              <Button variant="outline" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || isLoading || forceSubmitted} className="text-sm md:text-base">
                Previous
              </Button>
              {currentQuestionIndex < exam.questions.length - 1 ? (
                <Button onClick={handleNextQuestion} disabled={isLoading || forceSubmitted} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base">
                  Next
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isLoading || forceSubmitted} className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base">
                      <Send className="mr-2 h-4 w-4" /> Submit Exam
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent container={examInterfaceRef.current}>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-headline text-lg md:text-xl">Confirm Submission</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm md:text-base">
                        Are you sure you want to submit your answers? You cannot make changes after submission.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLoading || forceSubmitted} className="text-sm md:text-base">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleSubmit()} disabled={isLoading || forceSubmitted} className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm md:text-base">
                        {(isLoading || forceSubmitted) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {(isLoading || forceSubmitted) ? "Submitting..." : "Confirm & Submit"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
