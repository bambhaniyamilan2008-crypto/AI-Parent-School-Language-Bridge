"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/use-app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowRight,
  ChevronDown,
  Play,
  Pause,
  Loader2,
  Copy,
  RotateCcw,
  Edit2,
  Check,
  Send,
  HelpCircle,
} from "lucide-react";
import type { Sentiment } from "@/lib/types";
import { getTranslatedSpeech } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";

const sentimentVariant: Record<Sentiment, "destructive" | "neutral" | "default"> = {
    Negative: 'destructive',
    Neutral: 'neutral',
    Positive: 'default'
};

const availableLanguages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'gujarati', label: 'Gujarati' },
    { value: 'marathi', label: 'Marathi' },
    { value: 'tamil', label: 'Tamil' },
    { value: 'telugu', label: 'Telugu' },
    { value: 'punjabi', label: 'Punjabi' },
];

export default function ResultDisplay() {
  const { currentConversation, updateConversation, finishConversation, selectedTeacher, userProfile } = useAppContext();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const supportiveAudioRef = useRef<HTMLAudioElement>(null);
  const [isSupportivePlaying, setIsSupportivePlaying] = useState(false);
  const [supportiveDuration, setSupportiveDuration] = useState(0);
  const [supportiveCurrentTime, setSupportiveCurrentTime] = useState(0);
  const [supportiveAudioUri, setSupportiveAudioUri] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [isEditingOriginal, setIsEditingOriginal] = useState(false);
  const [isEditingRephrased, setIsEditingRephrased] = useState(false);
  
  const { transcription, rephrased, sentiment, explanation, audioDataUri } = currentConversation || {};
  const [editedTranscription, setEditedTranscription] = useState(transcription || "");
  const [editedRephrased, setEditedRephrased] = useState(rephrased || "");

  useEffect(() => {
    if (!transcription) {
      router.replace("/record");
    }
  }, [transcription, router]);

  useEffect(() => {
    const generateSpeech = async (lang: string) => {
        if (isGeneratingSpeech || !editedRephrased) return;
        
        setIsGeneratingSpeech(true);
        setSupportiveAudioUri(null);

        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (!idToken) throw new Error("Unauthorized.");
          
          const languageLabel = availableLanguages.find(l => l.value === lang)?.label || 'English';
          const result = await getTranslatedSpeech(idToken, editedRephrased, languageLabel);
          setSupportiveAudioUri(result.audioDataUri);
        } catch(e) {
            const error = e as Error;
            toast({
                title: "Speech Generation Failed",
                description: error.message || "Could not generate audio for the selected language.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingSpeech(false);
        }
    };
    
    if (editedRephrased) {
        generateSpeech(selectedLanguage);
    }
  }, [editedRephrased, selectedLanguage, auth, toast]);


  useEffect(() => {
    const audio = originalAudioRef.current;
    if (!audio) return;
    const setAudioData = () => { setDuration(audio.duration); setCurrentTime(audio.currentTime); }
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    return () => {
        audio.removeEventListener("loadeddata", setAudioData);
        audio.removeEventListener("timeupdate", setAudioTime);
    }
  }, []);

  useEffect(() => {
    const audio = supportiveAudioRef.current;
    if (!audio) return;
    const setAudioData = () => { setSupportiveDuration(audio.duration); setSupportiveCurrentTime(audio.currentTime); }
    const setAudioTime = () => setSupportiveCurrentTime(audio.currentTime);
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    return () => {
        audio.removeEventListener("loadeddata", setAudioData);
        audio.removeEventListener("timeupdate", setAudioTime);
    }
  }, [supportiveAudioUri]);

  if (!transcription) return null;
  
  const handlePlayPause = () => {
    if (originalAudioRef.current) {
      if (isPlaying) originalAudioRef.current.pause();
      else originalAudioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSupportivePlayPause = () => {
    if (supportiveAudioRef.current) {
      if (isSupportivePlaying) supportiveAudioRef.current.pause();
      else supportiveAudioRef.current.play();
      setIsSupportivePlaying(!isSupportivePlaying);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedRephrased);
    toast({ title: "Copied!", description: "Message copied to clipboard." });
  };

  const handleReMediate = () => {
    updateConversation({ transcription: editedTranscription });
    router.push('/processing');
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  const handleSendToTeacher = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
        updateConversation({ rephrased: editedRephrased, transcription: editedTranscription });
        await finishConversation();
        
        toast({
          title: "Success! Message Sent",
          description: `Teacher ${selectedTeacher?.name} has been notified via email and app dashboard.`,
        });
        
        router.push('/record');
    } catch (error) {
        toast({
            title: "Error Sending Message",
            description: "Please check your internet connection and try again.",
            variant: "destructive"
        });
    } finally {
        setIsSending(false);
    }
  }
  
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <Card className="glassmorphism relative overflow-hidden border-none shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg font-black tracking-tight">
            Original Message
            <div className="flex items-center gap-3">
                {sentiment && <Badge variant={sentimentVariant[sentiment]} className="px-3 py-1 font-bold">{sentiment}</Badge>}
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/50 active:scale-90" onClick={() => setIsEditingOriginal(!isEditingOriginal)}>
                    {isEditingOriginal ? <Check className="size-5 text-primary" /> : <Edit2 className="size-5 text-muted-foreground" />}
                </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingOriginal ? (
            <div className="space-y-4">
                <Textarea 
                    value={editedTranscription} 
                    onChange={(e) => setEditedTranscription(e.target.value)}
                    className="min-h-[120px] text-base leading-relaxed bg-white/20 border-primary/10 focus:bg-white/40"
                />
                <Button variant="outline" className="w-full rounded-xl py-6 border-primary/10 bg-white/40 hover:bg-white/60 active:scale-[0.98]" onClick={handleReMediate}>
                    <RotateCcw className="mr-3 size-5" />
                    Re-mediate transcription
                </Button>
            </div>
          ) : (
            <p className="text-foreground/90 text-lg leading-relaxed">{editedTranscription}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center -my-4 relative z-10">
        <div className="bg-primary rounded-full p-4 shadow-lg shadow-primary/30 ring-4 ring-background">
            <ArrowRight className="size-8 text-white animate-pulse" />
        </div>
      </div>

      <Card className="border-primary/20 border-2 shadow-2xl relative overflow-hidden rounded-[2rem]">
        <CardHeader className="pb-4 bg-primary/5">
          <CardTitle className="flex items-center justify-between text-xl font-black tracking-tight text-primary">
            Supportive Message
            <div className="flex items-center gap-3">
                <Badge variant="neutral" className="px-3 py-1 font-black tracking-widest uppercase text-[10px]">Reframed</Badge>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 active:scale-90" onClick={() => setIsEditingRephrased(!isEditingRephrased)}>
                    {isEditingRephrased ? <Check className="size-5 text-primary" /> : <Edit2 className="size-5 text-primary/60" />}
                </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {isEditingRephrased ? (
             <Textarea 
                value={editedRephrased} 
                onChange={(e) => setEditedRephrased(e.target.value)}
                className="min-h-[140px] text-xl font-bold leading-relaxed bg-primary/5 border-primary/20"
             />
          ) : (
             <p className="text-xl font-bold text-foreground leading-relaxed italic">"{editedRephrased}"</p>
          )}
          
          <div className="flex items-center justify-between">
            <Button
                variant="ghost"
                className="text-primary font-bold hover:bg-primary/5 px-0 h-auto active:scale-95"
                onClick={() => setShowExplanation(!showExplanation)}
            >
                <span>Why this works</span>
                <ChevronDown className={`ml-2 size-5 transition-transform duration-300 ${showExplanation ? "rotate-180" : ""}`} />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopy} className="h-10 px-5 rounded-full font-bold active:scale-95 shadow-sm">
                <Copy className="mr-2 size-4" />
                Copy
            </Button>
          </div>
          
          {showExplanation && (
            <p className="text-sm font-medium text-muted-foreground animate-fade-in rounded-2xl border border-primary/10 bg-primary/5 p-4 leading-relaxed">
              {explanation}
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card className="rounded-3xl border-none shadow-lg overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardContent className="space-y-6 p-6">
           {audioDataUri && <audio ref={originalAudioRef} src={audioDataUri} onEnded={() => setIsPlaying(false)} />}
           <div className="flex items-center gap-5">
            <Button size="icon" className="rounded-full h-14 w-14 shadow-lg active:scale-90" onClick={handlePlayPause} disabled={!audioDataUri}>
                {isPlaying ? <Pause className="size-7 fill-current"/> : <Play className="size-7 fill-current ml-1"/>}
            </Button>
            <div className="flex-1 space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Your Voice Note</p>
                <Slider value={[currentTime]} max={duration || 1} step={0.1} onValueChange={(v) => { if(originalAudioRef.current) originalAudioRef.current.currentTime = v[0]; }} disabled={!audioDataUri} className="cursor-pointer" />
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
           </div>

           <Separator className="bg-primary/5" />
           
           {supportiveAudioUri && <audio ref={supportiveAudioRef} src={supportiveAudioUri} onEnded={() => setIsSupportivePlaying(false)} />}
           <div className="flex items-center gap-5">
            <Button size="icon" className="rounded-full h-14 w-14 shadow-lg active:scale-90 bg-accent hover:bg-accent/90" onClick={handleSupportivePlayPause} disabled={isGeneratingSpeech || !supportiveAudioUri}>
                {isGeneratingSpeech ? <Loader2 className="size-7 animate-spin" /> : (isSupportivePlaying ? <Pause className="size-7 fill-current"/> : <Play className="size-7 fill-current ml-1"/>)}
            </Button>
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">AI Support Voice</p>
                    <div className="flex items-center gap-2">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isGeneratingSpeech}>
                            <SelectTrigger className="w-32 h-8 rounded-full border-none bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-widest">
                                <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {availableLanguages.map(lang => (
                                    <SelectItem key={lang.value} value={lang.value} className="text-xs font-bold">{lang.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Slider value={[supportiveCurrentTime]} max={supportiveDuration || 1} step={0.1} onValueChange={(v) => { if(supportiveAudioRef.current) supportiveAudioRef.current.currentTime = v[0]; }} disabled={isGeneratingSpeech || !supportiveAudioUri} className="cursor-pointer" />
                <div className="flex justify-between text-[10px] font-bold text-primary tabular-nums">
                    <span>{formatTime(supportiveCurrentTime)}</span>
                    <span>{formatTime(supportiveDuration)}</span>
                </div>
            </div>
           </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
                size="lg" 
                className="w-full h-16 rounded-2xl text-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98]" 
                disabled={isSending}
            >
                {isSending ? <Loader2 className="animate-spin mr-2" /> : "Send to " + (selectedTeacher?.name || 'Teacher')}
                {!isSending && <Send className="ml-3 size-6" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
            <AlertDialogHeader className="items-center text-center">
              <div className="bg-primary/10 p-4 rounded-3xl mb-4">
                <HelpCircle className="size-10 text-primary" />
              </div>
              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Send to {selectedTeacher?.name}?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                Are you sure you want to send this mediated message? It will be delivered to the teacher's dashboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
              <AlertDialogCancel className="h-12 rounded-xl border-primary/10 font-bold flex-1">Wait, Edit More</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendToTeacher} className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold flex-1">Yes, Send Now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" className="w-full h-12 text-muted-foreground font-bold hover:bg-white/50 rounded-xl active:scale-95" onClick={() => router.push('/record')}>
            Go back and edit message
        </Button>
      </div>
    </div>
  );
}
