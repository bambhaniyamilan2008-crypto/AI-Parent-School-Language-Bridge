
"use client";

import { useState, useRef, useMemo } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, School, Play, Pause, Loader2, Volume2, HelpCircle, Edit3, Trash2, Reply, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { getTranslatedSpeech } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
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
import { Badge } from "@/components/ui/badge";

const DEMO_TEACHER_REPLIES = [
  {
    id: "demo-t-1",
    senderId: "demo-teacher-1",
    senderName: "Mrs. Sharma",
    rephrased: "I would be happy to help you with those concepts after class today. Let's meet at 3 PM in the library.",
    timestamp: Date.now() - 3600000,
    role: "Teacher"
  },
  {
    id: "demo-t-2",
    senderId: "demo-teacher-2",
    senderName: "Mr. Verma",
    rephrased: "Excellent progress on your science project! I've shared some additional resources in the portal to help you further.",
    timestamp: Date.now() - 86400000,
    role: "Teacher"
  }
];

export function StudentDashboard() {
  const { history, userProfile, startConversation, updateConversation, selectedTeacher, setSelectedTeacher } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const [newMessageText, setNewMessageText] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const teacherReplies = useMemo(() => {
    const real = history.filter(
      (conv) => conv.receiverId === userProfile?.id && conv.role === 'Teacher'
    );
    return real.length > 0 ? real : DEMO_TEACHER_REPLIES;
  }, [history, userProfile?.id]);

  const sentMessages = history.filter(
    (conv) => conv.senderId === userProfile?.id && conv.role !== 'Teacher'
  );

  const handleSendMessage = () => {
    if (!newMessageText.trim()) return;
    
    startConversation();
    updateConversation({
      textMessage: newMessageText.trim(),
      role: "Child",
      receiverId: selectedTeacher?.id || "demo-teacher-1",
      receiverName: selectedTeacher?.name || "Teacher",
    });
    router.push("/processing");
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setLoadingAudioId(messageId);
    try {
      if (!userProfile?.id) throw new Error("Unauthorized.");
      const lang = userProfile?.language || "English";
      const { audioDataUri } = await getTranslatedSpeech(userProfile.id, text, lang);
      
      if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        audioRef.current.play();
        setPlayingId(messageId);
        
        audioRef.current.onended = () => setPlayingId(null);
      }
    } catch (error) {
      toast({
        title: "Audio Error",
        description: "Could not play the message audio.",
        variant: "destructive",
      });
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleReplyToTeacher = (teacherId: string, teacherName: string) => {
    if (selectedTeacher?.id !== teacherId) {
      setSelectedTeacher({ 
        id: teacherId, 
        name: teacherName, 
        subject: "Teacher", 
        schoolName: "Setu Academy", 
        availableTime: "M-F 9am-3pm" 
      });
    }
    
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    toast({
      title: "Replying to " + teacherName,
      description: "Type your supportive message below.",
    });
  };

  const handleRemoveTeacher = () => {
    setSelectedTeacher(null);
    toast({
        title: "Teacher Removed",
        description: "Teacher selection has been cleared.",
    });
  };

  return (
    <div className="flex flex-col flex-1 space-y-8 pb-20">
      <audio ref={audioRef} className="hidden" />
      
      <header className="text-center space-y-1 py-6 border-b border-primary/10">
        <h2 className="text-2xl font-black tracking-tight text-primary uppercase tracking-widest">SETU COMMUNICATION</h2>
      </header>

      {/* Section 1: Teacher Responses (Received) */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            1️⃣ Teacher Responses (Received)
        </h3>
        <Card className="border-primary/10 shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
                <ScrollArea className="h-[300px] px-6 py-6">
                <div className="space-y-6">
                {teacherReplies.map((msg) => (
                    <div key={msg.id} className="relative bg-primary/5 border border-primary/10 p-5 rounded-3xl">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                        <School className="size-3 text-primary" />
                        <span className="text-xs font-black uppercase text-primary tracking-widest">
                            {msg.senderName} (Teacher)
                        </span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-lg font-bold text-foreground leading-tight italic mb-4">
                        "{msg.rephrased}"
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-9 px-4 rounded-full font-bold shadow-sm active:scale-95 flex items-center gap-2 flex-1"
                        onClick={() => handlePlayAudio(msg.id, msg.rephrased)}
                        disabled={loadingAudioId === msg.id}
                      >
                        {loadingAudioId === msg.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : playingId === msg.id ? (
                          <Pause className="size-4 fill-current" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                        {playingId === msg.id ? "Stop" : "Listen"}
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-9 px-4 rounded-full font-bold shadow-sm active:scale-95 flex items-center gap-2 flex-1"
                        onClick={() => handleReplyToTeacher(msg.senderId, msg.senderName)}
                      >
                        <Reply className="size-4" />
                        Reply
                      </Button>
                    </div>
                    </div>
                ))}
                </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </section>

      {/* Section 2: Student Messages (Sent) */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            2️⃣ Your Sent Messages (Mediated)
        </h3>
        <Card className="border-primary/10 shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
                <ScrollArea className="h-[200px] px-6 py-6">
                {sentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center opacity-40">
                    <Send className="size-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No sent messages yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                    {sentMessages.map((msg) => (
                        <div key={msg.id} className="relative bg-white/40 border border-primary/5 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            Sent to: {msg.receiverName}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-base font-bold text-foreground leading-tight">
                            "{msg.rephrased}"
                        </p>
                        </div>
                    ))}
                    </div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
      </section>

      {/* Section 3: Recipients & New Message */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">3️⃣ Messaging Recipient</h3>
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/select-teacher")}
                className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
            >
                {selectedTeacher ? <Edit3 className="size-3 mr-1" /> : <UserPlus className="size-3 mr-1" />}
                {selectedTeacher ? "Change" : "Select Teacher"}
            </Button>
            {selectedTeacher && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveTeacher}
                    className="h-7 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5"
                >
                    <Trash2 className="size-3 mr-1" />
                    Remove
                </Button>
            )}
          </div>
        </div>
        
        <Card className="border-primary/20 border-2 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex justify-between items-center">
                    <span>Message to: {selectedTeacher?.name || "No teacher selected"}</span>
                    {selectedTeacher && (
                      <Badge variant="outline" className="bg-white/50 text-[9px] uppercase font-black">{selectedTeacher.subject}</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="relative">
                  <Textarea
                      ref={textareaRef}
                      placeholder={selectedTeacher ? "Type your constructive message here..." : "Please select a teacher first to enable messaging."}
                      className="min-h-[120px] rounded-2xl border-primary/10 bg-primary/5 focus:bg-white transition-all text-base font-medium"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      disabled={!selectedTeacher}
                  />
                  {!selectedTeacher && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                      <Button variant="default" className="rounded-full shadow-lg font-black uppercase tracking-widest text-[10px]" onClick={() => router.push("/select-teacher")}>
                        Choose Recipient First
                      </Button>
                    </div>
                  )}
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!newMessageText.trim() || !selectedTeacher}
                      className="w-full h-16 rounded-2xl text-xl font-black uppercase tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-4 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                      {selectedTeacher ? `Send to ${selectedTeacher.name.split(' ')[1]}` : "Send Message"}
                      <Send className="size-6" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
                    <AlertDialogHeader className="items-center text-center">
                      <div className="bg-primary/10 p-4 rounded-3xl mb-4">
                        <HelpCircle className="size-10 text-primary" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Send for Mediation?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                        Your message will be analyzed by SETU AI to create a supportive and constructive version for the teacher.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                      <AlertDialogCancel className="h-12 rounded-xl border-primary/10 font-bold flex-1">Review Message</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSendMessage} className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold flex-1">Yes, Process</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}
