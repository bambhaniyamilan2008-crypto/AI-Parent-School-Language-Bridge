
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Send, Trash2, Keyboard, X, Waves, HelpCircle } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Waveform = ({ analyser }: { analyser: AnalyserNode | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 4;
      canvasCtx.strokeStyle = "hsl(var(--primary))";
      canvasCtx.lineCap = "round";

      canvasCtx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser]);

  return <canvas ref={canvasRef} width={600} height={100} className="h-full w-full" />;
};

const StaticWaveform = () => {
  const [heights, setHeights] = useState<number[]>([]);

  useEffect(() => {
    const randomHeights = Array.from({ length: 24 }, () => Math.random() * 40 + 10);
    setHeights(randomHeights);
  }, []);

  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {heights.length > 0 ? (
        heights.map((h, i) => (
          <div
            key={i}
            className="w-1.5 bg-primary/20 rounded-full transition-all duration-500 ease-in-out"
            style={{ height: `${h}%` }}
          />
        ))
      ) : (
        Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-1.5 bg-primary/10 rounded-full h-4" />
        ))
      )}
    </div>
  );
};

export default function VoiceRecorder() {
  const { currentConversation, startConversation, updateConversation, userProfile, selectedTeacher } = useAppContext();
  const { status, audioDataUri: recordedAudioUri, analyser, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const router = useRouter();
  
  const [textMessage, setTextMessage] = useState(currentConversation?.textMessage || "");
  const [showTextInput, setShowTextInput] = useState(!!currentConversation?.textMessage);
  const [persistedAudioUri, setPersistedAudioUri] = useState(currentConversation?.audioDataUri || "");

  const audioDataUri = recordedAudioUri || persistedAudioUri;
  const isRecording = status === "recording";
  const hasAudio = !!audioDataUri && status !== "recording";

  const handleSend = useCallback(() => {
    if (!audioDataUri && !textMessage.trim()) return;
    
    if (!currentConversation?.id) {
        startConversation();
    }

    updateConversation({
      audioDataUri: audioDataUri || undefined,
      textMessage: textMessage.trim() || undefined,
      role: userProfile?.role || "Child",
      receiverId: selectedTeacher?.id || "demo-teacher-1",
    });
    router.push("/processing");
  }, [audioDataUri, textMessage, userProfile, currentConversation?.id, startConversation, updateConversation, router, selectedTeacher]);

  const handleDeleteAudio = () => {
    resetRecording();
    setPersistedAudioUri("");
    updateConversation({ audioDataUri: undefined });
  };

  const handleTextChange = (val: string) => {
    setTextMessage(val);
    updateConversation({ textMessage: val || undefined });
  };

  const lang = userProfile?.language || "English";

  const ConfirmSendDialog = ({ trigger }: { trigger: React.ReactNode }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
        <AlertDialogHeader className="items-center text-center">
          <div className="bg-primary/10 p-4 rounded-3xl mb-4">
            <HelpCircle className="size-10 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Send for Mediation?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm font-medium leading-relaxed">
            Your message will be analyzed by Setu AI to create a constructive and supportive version for the teacher.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <AlertDialogCancel className="h-12 rounded-xl border-primary/10 font-bold flex-1">Review Again</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend} className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold flex-1">Yes, Process</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!showTextInput) {
    return (
      <div className="flex flex-col flex-1 w-full items-center justify-between pb-4 pt-2">
        <div className="w-full flex items-center justify-center min-h-[120px]">
          <div className="h-24 w-full max-w-xs flex items-center justify-center">
            {isRecording && analyser ? <Waveform analyser={analyser} /> : <StaticWaveform />}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 py-10">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 -m-6 rounded-full bg-primary/20 animate-pulse-ring" />
            )}
            <div
              className={cn(
                "relative z-10 flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-full bg-white transition-all duration-300 ease-out mic-shadow",
                isRecording ? "scale-110 shadow-primary/30" : "hover:scale-105"
              )}
            >
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "h-36 w-36 sm:h-44 sm:w-44 rounded-full shadow-inner transition-all active:scale-90",
                  isRecording ? "bg-primary" : "bg-primary"
                )}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                <Mic className={cn("transition-transform duration-300", isRecording ? "h-18 w-18 sm:h-20 sm:w-20 scale-110" : "h-16 w-16 sm:h-18 sm:w-18", "text-white")} />
              </Button>
            </div>
          </div>

          <p className={cn(
            "text-lg font-bold tracking-tight transition-all duration-300",
            isRecording ? "text-primary animate-pulse" : "text-primary/60"
          )}>
            {isRecording ? t('listening', lang) : t('tap_to_speak', lang)}
          </p>
        </div>

        <div className="w-full space-y-6">
          {hasAudio && (
            <div className="flex items-center justify-between bg-primary/10 rounded-2xl p-4 animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">
                  {t('voice_ready', lang)}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDeleteAudio} className="text-destructive hover:bg-destructive/10 h-10 w-10 rounded-full">
                <Trash2 className="size-5" />
              </Button>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <Button
              variant="outline"
              className="w-full rounded-2xl py-7 border-primary/10 bg-white/60 backdrop-blur-sm text-primary hover:bg-white hover:border-primary/30 transition-all shadow-sm group active:scale-[0.98]"
              onClick={() => setShowTextInput(true)}
            >
              <Keyboard className="mr-3 size-6 transition-transform group-hover:scale-110" />
              <span className="font-semibold">{textMessage ? "Edit written message" : "Add written message"}</span>
            </Button>

            {hasAudio && (
              <ConfirmSendDialog trigger={
                <Button
                  size="lg"
                  className="w-full rounded-2xl h-16 text-lg font-bold shadow-xl shadow-primary/20 animate-fade-in bg-primary hover:bg-primary/90 active:scale-[0.98]"
                >
                  {t('send', lang)}
                  <Send className="ml-3 size-6" />
                </Button>
              } />
            )}
          </div>

          <p className="text-[10px] text-center text-muted-foreground/40 uppercase font-bold tracking-widest">
            Speak clearly or type above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full pt-2 animate-fade-in">
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl border border-primary/10 shadow-2xl shadow-primary/5 mb-8 overflow-hidden transition-all duration-300 min-h-[300px]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-primary/5 bg-white/30">
          <div className="flex items-center gap-3">
            <Keyboard className="size-5 text-primary" />
            <span className="text-[11px] font-black text-primary/80 uppercase tracking-widest">Type Message</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => setShowTextInput(false)}
          >
            <X className="size-6" />
          </Button>
        </div>

        <Textarea
          placeholder="What would you like to say?"
          className="border-none bg-transparent flex-1 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xl p-8 leading-relaxed font-medium placeholder:text-muted-foreground/40"
          value={textMessage}
          onChange={(e) => handleTextChange(e.target.value)}
          autoFocus
        />

        {hasAudio && (
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between bg-primary/5 rounded-2xl p-4 border border-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-black text-primary/70 uppercase tracking-widest">Voice recording attached</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleDeleteAudio} className="text-destructive h-9 w-9 rounded-full hover:bg-destructive/10">
                <Trash2 className="size-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between w-full pb-6 gap-5">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-20 w-20 rounded-2xl border-primary/10 bg-white shadow-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all active:scale-90"
          onClick={() => setShowTextInput(false)}
          title="Switch to voice mode"
        >
           <Waves className="size-10" />
        </Button>

        <ConfirmSendDialog trigger={
          <Button
            size="lg"
            className="h-20 flex-1 rounded-2xl text-2xl font-black uppercase tracking-tighter shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.96] bg-primary hover:bg-primary/90"
            disabled={!textMessage.trim() && !hasAudio}
          >
            Send
            <Send className="ml-4 size-7" />
          </Button>
        } />
      </div>
      
      <p className="text-[11px] text-center text-muted-foreground/40 font-bold uppercase tracking-[0.2em] mb-4">
        AI-Powered Mediation Active
      </p>
    </div>
  );
}
