"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  School,
  User,
  Volume2,
  Pause,
  Play,
  Loader2,
  HelpCircle,
  Reply,
  UserPlus,
  Megaphone,
  Search,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  RotateCcw,
  MessageSquareQuote,
  Globe,
  Mic,
  Waves,
  Inbox,
  CloudOff,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  ThumbsUp,
  Type,
  Maximize2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { getTranslatedSpeech, transcribeAudioAction } from "@/app/actions";
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
import { useFirestore, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { collection, query, where, orderBy, doc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import type { SchoolNotice, Conversation, NoticeAcknowledgement, UserProfile } from "@/lib/types";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const categoryFilters = [
  "All Notices",
  "General Notice",
  "Parent-Teacher Meeting",
  "Attendance Notice",
  "Homework",
  "Examination",
  "School Holiday",
  "School Activity",
  "Important Announcement"
];

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
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [analyser]);

  return <canvas ref={canvasRef} width={600} height={100} className="h-full w-full" />;
};

export function ParentDashboard() {
  const { 
    history, 
    userProfile, 
    notifications, 
    startConversation, 
    updateConversation, 
    selectedTeacher, 
    setSelectedTeacher, 
    markNotificationAsRead, 
    isOnline 
  } = useAppContext();
  
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"messages" | "notices">("notices");
  const [newMessageText, setNewMessageText] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice Chat State
  const { status: recordStatus, startRecording, stopRecording, resetRecording, audioDataUri, analyser } = useAudioRecorder();
  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Translation Display State for Inbox
  const [messageViewLangs, setMessageViewLangs] = useState<{ [msgId: string]: 'original' | 'translated' }>({});

  const toggleMsgLang = (id: string) => {
    setMessageViewLangs(prev => ({
      ...prev,
      [id]: prev[id] === 'translated' ? 'original' : 'translated'
    }));
  };

  // Notice context for messaging
  const [activeNoticeContext, setActiveNoticeContext] = useState<{ id: string, title: string } | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Notices");

  // Fetch School Notices
  const noticesQuery = useMemoFirebase(() => {
    return query(
      collection(db, "school_notices"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
  }, [db]);

  const { data: rawNotices, isLoading: isLoadingNotices, isFromCache: isNoticesFromCache } = useCollection<SchoolNotice>(noticesQuery);

  // Fetch My Acknowledgements
  const myAcksQuery = useMemoFirebase(() => {
    if (!userProfile?.id) return null;
    return query(
      collection(db, "notice_acknowledgements"),
      where("parentUid", "==", userProfile.id)
    );
  }, [db, userProfile?.id]);

  const { data: myAcks } = useCollection<NoticeAcknowledgement>(myAcksQuery);

  const filteredNotices = useMemo(() => {
    if (!rawNotices) return [];
    
    return rawNotices.filter(notice => {
      const isForMe = notice.recipients === "All Parents" || 
                    (notice.recipients === "Selected Class Parents" && (notice.targetClass === "All Classes" || notice.targetClass === userProfile?.childClass));
      
      if (!isForMe) return false;
      if (activeCategory !== "All Notices" && notice.type !== activeCategory) return false;
      if (searchQuery && !notice.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [rawNotices, activeCategory, searchQuery, userProfile?.childClass]);

  const teacherMessages = useMemo(() => {
    return history.filter(
      (conv) => conv.receiverId === userProfile?.id && conv.role === 'Teacher'
    );
  }, [history, userProfile?.id]);

  const sentMessages = history.filter(
    (conv) => conv.senderId === userProfile?.id && conv.role === 'Parent'
  );

  const { hasPendingWrites: hasSentWrites } = useCollection(useMemoFirebase(() => {
      if(!userProfile?.id) return null;
      return query(collection(db, "conversations"), where("senderId", "==", userProfile.id));
  }, [db, userProfile?.id]));

  const handleSendMessage = () => {
    if (!newMessageText.trim()) return;
    
    startConversation();
    updateConversation({
      textMessage: newMessageText.trim(),
      role: "Parent",
      receiverId: selectedTeacher?.id || "demo-teacher-1",
      receiverName: selectedTeacher?.name || "Teacher",
      receiverLanguage: "English",
      noticeId: activeNoticeContext?.id,
      noticeTitle: activeNoticeContext?.title,
      // If offline, we'll manually set rephrased same as original for immediate local send
      rephrased: isOnline ? undefined : newMessageText.trim(),
      transcription: isOnline ? undefined : newMessageText.trim(),
    });

    if (isOnline) {
        router.push("/processing");
    } else {
        router.push("/history");
        toast({ 
          title: "Saved Offline", 
          description: "Message saved to outbox. It will be mediated and sent once you are back online.",
        });
    }
  };

  // Voice Chat Logic
  const handleStartVoiceChat = async () => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "Voice transcription requires an active internet connection.", variant: "destructive" });
      return;
    }
    try {
      await startRecording();
      setIsRecordingChat(true);
      setRecordDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  };

  const handleStopVoiceChat = async () => {
    stopRecording();
    setIsRecordingChat(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleCancelVoiceChat = () => {
    resetRecording();
    setIsRecordingChat(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  useEffect(() => {
    if (audioDataUri && !isRecordingChat && !isTranscribing) {
      const transcribe = async () => {
        setIsTranscribing(true);
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (!idToken) throw new Error("Unauthorized.");
          
          const text = await transcribeAudioAction(idToken, audioDataUri);
          setTranscribedText(text);
          setShowTranscriptReview(true);
        } catch (error) {
          toast({ title: "Transcription Error", description: "Could not understand speech.", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
          resetRecording();
        }
      };
      transcribe();
    }
  }, [audioDataUri, isRecordingChat, isTranscribing, resetRecording, toast, auth]);

  const handleConfirmTranscript = () => {
    setNewMessageText(transcribedText);
    setShowTranscriptReview(false);
  };

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "Voice playback requires an active internet connection.", variant: "destructive" });
      return;
    }
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setLoadingAudioId(messageId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized.");
      
      const lang = userProfile?.language || "English";
      const { audioDataUri } = await getTranslatedSpeech(idToken, text, lang);
      
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
    setActiveTab("messages");
    setActiveNoticeContext(null); 
    if (selectedTeacher?.id !== teacherId) {
      setSelectedTeacher({ 
        id: teacherId, 
        name: teacherName, 
        role: "Teacher",
        subtext: "Teacher", 
        secondaryText: "Setu Bharat",
        language: "English"
      });
    }
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    toast({
      title: "Replying to " + teacherName,
      description: "Type or record your supportive message below.",
    });
  };

  const handleAskAboutNotice = (notice: SchoolNotice) => {
    setActiveTab("messages");
    setActiveNoticeContext({ id: notice.id, title: notice.title });
    setSelectedTeacher({
      id: notice.teacherId,
      name: notice.teacherName,
      role: "Teacher",
      subtext: "Teacher",
      secondaryText: "Setu Bharat",
      language: "English"
    });

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    toast({
      title: "Asking about: " + notice.title,
      description: "Your message will be linked to this school notice.",
    });
  };

  const handleNoticeViewed = async (noticeId: string) => {
    const linkedNotif = notifications.find(n => n.noticeId === noticeId && !n.isRead);
    if (linkedNotif) {
      await markNotificationAsRead(linkedNotif.id);
    }
  };

  const handleSubmitAcknowledgement = (noticeId: string, status: 'understood' | 'clarify') => {
    if (!userProfile?.id) return;
    
    const ackId = `${noticeId}_${userProfile.id}`;
    const ackRef = doc(db, "notice_acknowledgements", ackId);
    
    const data: NoticeAcknowledgement = {
      id: ackId,
      noticeId,
      parentUid: userProfile.id,
      parentName: userProfile.name,
      status,
      timestamp: new Date().toISOString(),
      offlineStored: !isOnline
    };

    setDoc(ackRef, data, { merge: true }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `notice_acknowledgements/${ackId}`,
            operation: 'write',
            requestResourceData: data
        }));
    });

    toast({
      title: "Response Saved",
      description: status === 'understood' 
        ? "School notified of your confirmation." 
        : "Teacher will be notified you need more info.",
    });

    if (status === 'clarify') {
      const notice = filteredNotices.find(n => n.id === noticeId);
      if (notice) handleAskAboutNotice(notice);
    }
  };

  // Accessibility Mappings
  const textSizeClass = userProfile?.textSize === 'large' ? 'text-lg' : userProfile?.textSize === 'medium' ? 'text-base' : 'text-sm';
  const headingSizeClass = userProfile?.textSize === 'large' ? 'text-2xl' : userProfile?.textSize === 'medium' ? 'text-xl' : 'text-lg';

  return (
    <div className={cn("flex flex-col flex-1 space-y-6 pb-20", userProfile?.easyReadingMode && "max-w-2xl mx-auto")}>
      <audio ref={audioRef} className="hidden" />

      {/* Connectivity Alert for Parents */}
      {!isOnline && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 animate-fade-in" role="alert">
           <WifiOff className="size-5 text-primary" />
           <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase text-primary">Limited Offline Access</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">You can read cached notices and compose text replies. AI features and audio generation are unavailable.</p>
           </div>
        </div>
      )}

      {/* Primary Navigation Toggle */}
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-40">
        <Button 
          variant={activeTab === "notices" ? "default" : "ghost"} 
          className={cn("rounded-xl h-12 px-4 font-black uppercase tracking-widest text-[10px] flex-1 transition-all")}
          onClick={() => setActiveTab("notices")}
          aria-pressed={activeTab === "notices"}
        >
          <Megaphone className="size-4 mr-2" />
          School Notices
          {notifications.some(n => !n.isRead) && activeTab !== "notices" && (
            <span className="ml-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </Button>
        <Button 
          variant={activeTab === "messages" ? "default" : "ghost"} 
          className={cn("rounded-xl h-12 px-4 font-black uppercase tracking-widest text-[10px] flex-1 transition-all")}
          onClick={() => setActiveTab("messages")}
          aria-pressed={activeTab === "messages"}
        >
          <MessageCircle className="size-4 mr-2" />
          Direct Messages
          {hasSentWrites && <span className="ml-2 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
        </Button>
      </div>

      {activeTab === "notices" ? (
        <div className="animate-fade-in space-y-6">
          <header className="text-center space-y-1 py-4 border-b border-primary/10">
            <h2 className={cn("font-black tracking-tight text-primary uppercase tracking-widest", headingSizeClass)}>OFFICIAL NOTICES</h2>
            {isNoticesFromCache && !isOnline && <p className="text-[8px] font-black text-amber-600 uppercase">Viewing Cached Content</p>}
          </header>

          <div className="space-y-4 px-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search notices by title..."
                className="h-12 pl-11 rounded-2xl border-primary/10 bg-white shadow-sm focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search school notices"
              />
            </div>

            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex gap-2">
                {categoryFilters.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 rounded-full text-[10px] font-black uppercase tracking-widest px-4 transition-all",
                      activeCategory === cat ? "bg-primary text-white hover:bg-primary/90" : "bg-white/40 border-primary/5 hover:bg-white"
                    )}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            {isLoadingNotices ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="rounded-[2rem] border-primary/10 overflow-hidden">
                    <CardContent className="p-6 space-y-4">
                      <div className="h-4 w-1/3 bg-muted animate-pulse rounded-full" />
                      <div className="h-8 w-3/4 bg-muted animate-pulse rounded-xl" />
                      <div className="h-16 w-full bg-muted animate-pulse rounded-2xl" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNotices.length === 0 ? (
              <Card className="border-dashed border-2 border-primary/10 bg-primary/5 rounded-[2.5rem]">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-primary/5">
                    <Info className="size-12 text-primary opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-foreground tracking-tight">No notices found</h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-[240px]">
                      When the school posts official updates for you, they will appear here in your preferred language.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredNotices.map((notice) => (
                  <NoticeCard 
                    key={notice.id} 
                    notice={notice} 
                    userProfile={userProfile!}
                    onAskTeacher={() => handleAskAboutNotice(notice)} 
                    isUnread={notifications.some(n => n.noticeId === notice.id && !n.isRead)}
                    onViewed={() => handleNoticeViewed(notice.id)}
                    isOnline={isOnline}
                    acknowledgement={myAcks?.find(a => a.noticeId === notice.id)}
                    onAcknowledge={(status) => handleSubmitAcknowledgement(notice.id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Direct Messages View */
        <div className="animate-fade-in space-y-8">
          <header className="text-center space-y-1 py-4 border-b border-primary/10">
            <h2 className={cn("font-black tracking-tight text-primary uppercase tracking-widest", headingSizeClass)}>SETU Bharat COMMUNICATION</h2>
          </header>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                1️⃣ Received Messages
            </h3>
            <Card className="border-primary/10 shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden">
                <CardContent className="p-0">
                    <ScrollArea className="h-[350px] px-6 py-6">
                      <div className="space-y-8">
                        {teacherMessages.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                             <Inbox className="size-12 mb-2" />
                             <p className="text-xs font-black uppercase tracking-widest px-4">No responses from teachers yet.</p>
                           </div>
                        ) : teacherMessages.map((msg) => {
                          const isViewingTranslated = messageViewLangs[msg.id] === 'translated';
                          const hasTranslation = !!msg.translatedText;
                          const displayContent = isViewingTranslated ? msg.translatedText : msg.rephrased;
                          const displayLang = isViewingTranslated ? (msg.translatedLanguage || userProfile?.language) : "English";

                          return (
                            <div key={msg.id} className="bg-primary/5 rounded-3xl p-6 border border-primary/10 transition-all hover:bg-primary/10">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  <School className="size-3 text-primary" />
                                  <span className="text-xs font-black uppercase tracking-widest text-primary">
                                    {msg.senderName} (Teacher)
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              {msg.noticeTitle && (
                                <div className="flex items-center gap-1.5 mb-2 px-1 text-primary/60">
                                  <MessageSquareQuote className="size-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">RE: {msg.noticeTitle}</span>
                                </div>
                              )}
                              
                              <div className="space-y-3">
                                <p className={cn("font-bold text-foreground leading-snug italic", textSizeClass)}>
                                  "{displayContent}"
                                </p>
                                
                                <div className="flex items-center justify-between border-t border-primary/5 pt-2">
                                  <div className="flex items-center gap-1.5">
                                     <Globe className="size-3 text-primary/40" />
                                     <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                                       {isViewingTranslated ? "AI Translated" : "School Original"} • {displayLang}
                                     </span>
                                  </div>
                                  {hasTranslation && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5"
                                      onClick={() => toggleMsgLang(msg.id)}
                                    >
                                      {isViewingTranslated ? "View Original" : `View ${userProfile?.language}`}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2 mt-4">
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-9 px-4 rounded-full font-bold shadow-sm active:scale-95 flex items-center gap-2 flex-1"
                                  onClick={() => handlePlayAudio(msg.id, displayContent || "")}
                                  disabled={loadingAudioId === msg.id || !isOnline}
                                  aria-label={`Listen to message from ${msg.senderName}`}
                                >
                                  {loadingAudioId === msg.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : playingId === msg.id ? (
                                    <Pause className="size-4 fill-current" />
                                  ) : (
                                    <Volume2 className="size-4" />
                                  )}
                                  {playingId === msg.id ? "Stop" : (isOnline ? "Listen" : "Online Required")}
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
                          );
                        })}
                      </div>
                  </ScrollArea>
                </CardContent>
              </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                2️⃣ Sent Messages
            </h3>
            <Card className="border-primary/10 shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden">
                <CardContent className="p-0">
                    <ScrollArea className="h-[250px] px-6 py-6">
                    {sentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                        <Send className="size-12 mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest px-4">No messages yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {sentMessages.map((msg) => (
                          <div key={msg.id} className="relative bg-white/40 border border-primary/5 p-5 rounded-3xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                To: {msg.receiverName}
                              </span>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                </span>
                                {hasSentWrites && (
                                   <Badge className="bg-amber-500 text-white animate-pulse text-[7px] h-3 uppercase font-black tracking-widest px-1 py-0">
                                      <RefreshCw className="size-2 mr-0.5 animate-spin" /> Pending Sync
                                   </Badge>
                                )}
                              </div>
                            </div>
                            <p className={cn("font-bold text-foreground leading-tight", textSizeClass)}>
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

          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">3️⃣ Quick Reply</h3>
              <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push("/select-teacher")}
                    className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                >
                    <UserPlus className="size-3 mr-1" />
                    Change Teacher
                </Button>
              </div>
            </div>
            
            <Card className="border-primary/20 border-2 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                          <span>Target: {selectedTeacher?.name || "Select a teacher"}</span>
                          {activeNoticeContext && (
                             <span className="text-[9px] font-bold text-primary/60 lowercase italic">About: {activeNoticeContext.title}</span>
                          )}
                        </div>
                        {!isOnline && <Badge variant="neutral" className="bg-amber-100 text-amber-600 text-[8px] uppercase font-black px-2"><CloudOff className="size-2 mr-1" /> Offline</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="relative group">
                      <Textarea
                          ref={textareaRef}
                          placeholder={selectedTeacher ? "Type or record your supportive message..." : "Choose a teacher to start writing."}
                          className={cn("min-h-[120px] rounded-2xl border-primary/10 bg-primary/5 focus:bg-white transition-all font-medium p-4 pr-12", textSizeClass)}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          disabled={!selectedTeacher}
                          aria-label="Message text"
                      />
                      {selectedTeacher && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-3 top-3 h-10 w-10 rounded-full bg-white shadow-sm border border-primary/5 text-primary hover:bg-primary hover:text-white transition-all"
                          onClick={handleStartVoiceChat}
                          disabled={isTranscribing || !isOnline}
                          aria-label="Start voice recording"
                        >
                          {isTranscribing ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
                        </Button>
                      )}
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={!newMessageText.trim() || !selectedTeacher}
                          className="w-full h-16 rounded-2xl text-xl font-black uppercase tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-4 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                        >
                          {isOnline ? "Confirm & Send" : "Save to Outbox"}
                          <Send className="size-6" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
                        <AlertDialogHeader className="items-center text-center">
                          <div className="bg-primary/10 p-4 rounded-3xl mb-4">
                            {isOnline ? <HelpCircle className="size-10 text-primary" /> : <WifiOff className="size-10 text-amber-500" />}
                          </div>
                          <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">
                            {isOnline ? "AI Mediation Active" : "Save Offline Message?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            {isOnline 
                              ? "SETU AI will transform your input into a constructive message and translate it to the teacher's language." 
                              : "You are offline. Your message will be saved and synchronized automatically when you reconnect."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
                          <AlertDialogCancel className="h-12 rounded-xl border-primary/10 font-bold flex-1">Back</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSendMessage} className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold flex-1">
                             {isOnline ? "Send Now" : "Save Offline"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* Voice Recording Dialog (Internet Required) */}
      <AlertDialog open={isRecordingChat} onOpenChange={setIsRecordingChat}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-sm text-center">
          <AlertDialogHeader className="space-y-4">
            <div className="relative mx-auto" role="img" aria-label="Microphone listening">
              <div className="absolute inset-0 -m-6 rounded-full bg-primary/20 animate-pulse-ring" />
              <div className="relative z-10 bg-primary p-8 rounded-full shadow-2xl shadow-primary/30">
                <Mic className="size-12 text-white animate-pulse" />
              </div>
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-primary">Listening...</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-muted-foreground">
              Speak clearly. Internet required for transcription.
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-black tabular-nums">{format(recordDuration * 1000, "mm:ss")}</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="h-24 w-full flex items-center justify-center my-6">
            <Waveform analyser={analyser} />
          </div>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-4">
            <Button className="h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl" onClick={handleStopVoiceChat}>
              Stop & Transcribe
            </Button>
            <Button variant="ghost" className="h-12 rounded-xl font-bold text-muted-foreground" onClick={handleCancelVoiceChat}>
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transcription Review Dialog */}
      <AlertDialog open={showTranscriptReview} onOpenChange={setShowTranscriptReview}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-primary mb-2">
              <Waves className="size-6" />
              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Review Transcription</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground">
              Verify your spoken words before sending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-6">
            <Textarea
              className={cn("min-h-[140px] bg-primary/5 border-primary/10 rounded-2xl font-bold italic p-6 focus:bg-white", textSizeClass)}
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              aria-label="Edit transcription"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
            <AlertDialogCancel className="h-14 rounded-2xl font-bold flex-1" onClick={() => setShowTranscriptReview(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest flex-1 shadow-lg" onClick={handleConfirmTranscript}>
              Confirm Text
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoticeCard({ 
  notice, 
  userProfile,
  onAskTeacher, 
  isUnread,
  onViewed,
  isOnline,
  acknowledgement,
  onAcknowledge
}: { 
  notice: SchoolNotice, 
  userProfile: UserProfile, 
  onAskTeacher: () => void,
  isUnread: boolean,
  onViewed: () => void,
  isOnline: boolean,
  acknowledgement?: NoticeAcknowledgement,
  onAcknowledge: (status: 'understood' | 'clarify') => void
}) {
  const preferredLanguage = userProfile.language || "English";
  const [displayLanguage, setDisplayLanguage] = useState(preferredLanguage);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const availableLangs = Object.keys(notice.translations);
    if (!availableLangs.includes(preferredLanguage) && availableLangs.length > 0) {
      setDisplayLanguage(availableLangs.includes("English") ? "English" : availableLangs[0]);
    }
  }, [notice.translations, preferredLanguage]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const contentText = notice.translations[displayLanguage] || notice.simplifiedMessage;
  const audioUri = notice.audioUris[displayLanguage];

  const togglePlay = () => {
    if (!isOnline) return;
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const textSizeClass = userProfile.textSize === 'large' ? 'text-lg' : userProfile.textSize === 'medium' ? 'text-base' : 'text-sm';
  const headingSizeClass = userProfile.textSize === 'large' ? 'text-2xl' : userProfile.textSize === 'medium' ? 'text-xl' : 'text-lg';

  const cardPadding = userProfile.easyReadingMode ? "p-8" : "p-6";

  return (
    <Card className={cn(
      "group relative border-primary/10 shadow-lg rounded-[2rem] bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] border-2",
      isUnread && "ring-2 ring-destructive/20 border-destructive/10",
      userProfile.easyReadingMode && "shadow-2xl"
    )} role="article" aria-labelledby={`notice-title-${notice.id}`}>
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", isUnread ? "bg-destructive" : "bg-primary")} />
      
      <CardHeader className={cn("pb-4 pt-6 flex flex-row items-start justify-between px-6", userProfile.easyReadingMode && "px-8")}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5", isUnread ? "bg-destructive" : "bg-primary")}>
              {notice.type}
            </Badge>
            {isUnread && (
              <Badge variant="neutral" className="bg-destructive/10 text-destructive text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                New
              </Badge>
            )}
          </div>
          <CardTitle id={`notice-title-${notice.id}`} className={cn("font-black tracking-tight text-foreground leading-tight group-hover:text-primary transition-colors", headingSizeClass)}>
            {notice.title}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <School className="size-3" />
            {notice.teacherName}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className={cn("pb-6 space-y-5 px-6", userProfile.easyReadingMode && "px-8 pb-8 space-y-7")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Language</p>
          <Select value={displayLanguage} onValueChange={setDisplayLanguage}>
            <SelectTrigger className="h-8 w-32 rounded-full border-none bg-primary/5 text-primary font-black text-[9px] uppercase tracking-widest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              {Object.keys(notice.translations).map(lang => (
                <SelectItem key={lang} value={lang} className="text-[10px] font-bold uppercase tracking-widest">{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(
            "bg-primary/5 rounded-3xl border border-primary/5 italic relative",
            userProfile.easyReadingMode ? "p-8 border-2" : "p-5"
        )}>
          <p className={cn("font-bold text-foreground leading-relaxed", userProfile.easyReadingMode && "leading-loose", textSizeClass)}>
            "{contentText}"
          </p>
        </div>

        {audioUri && (
          <div className={cn("p-4 rounded-2xl border flex items-center gap-4", isOnline ? "bg-indigo-50 border-indigo-100" : "bg-muted/50 border-muted opacity-60")} role="region" aria-label={`Audio player for ${displayLanguage}`}>
            {isOnline && (
              <audio 
                ref={audioRef} 
                src={audioUri} 
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
              />
            )}
            <Button 
              size="icon" 
              className={cn("h-10 w-10 rounded-full shadow-md shrink-0 active:scale-90", isOnline ? "bg-indigo-600 hover:bg-indigo-700" : "bg-muted-foreground")}
              onClick={togglePlay}
              disabled={!isOnline}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-1" />}
            </Button>
            <div className="flex-1 space-y-1.5">
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">{isOnline ? "Listen Now" : "Voice Unavailable Offline"}</span>
                  <div className="flex items-center gap-3">
                    {isOnline && (
                        <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                            <SelectTrigger className="h-6 w-16 p-0 border-none bg-transparent font-black text-[8px] uppercase text-indigo-500 shadow-none focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="0.75">0.75x</SelectItem>
                                <SelectItem value="1">1.0x</SelectItem>
                                <SelectItem value="1.25">1.25x</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {isOnline && <span className="text-[9px] font-bold text-indigo-400 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>}
                  </div>
               </div>
               <Slider 
                value={[currentTime]} 
                max={duration || 100} 
                step={0.1}
                disabled={!isOnline}
                onValueChange={(val) => { if(audioRef.current) audioRef.current.currentTime = val[0]; }}
                aria-label="Playback progress"
               />
            </div>
          </div>
        )}

        {notice.requireAcknowledgement && (
          <div className="space-y-3 pt-2">
             <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[9px] uppercase font-black text-indigo-600 border-indigo-100 bg-indigo-50/50">Response Required</Badge>
                {acknowledgement?.offlineStored && (
                    <Badge className="bg-amber-500 text-white text-[7px] h-3 uppercase font-black tracking-widest px-1 py-0">
                        <RefreshCw className="size-2 mr-0.5 animate-spin" /> Pending Sync
                    </Badge>
                )}
             </div>

             {acknowledgement ? (
               <div className={cn(
                 "p-4 rounded-2xl flex items-center justify-between border",
                 acknowledgement.status === 'understood' ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
               )}>
                  <div className="flex items-center gap-2">
                     {acknowledgement.status === 'understood' ? <CheckCircle2 className="size-4 text-green-600" /> : <HelpCircle className="size-4 text-amber-600" />}
                     <span className={cn("text-xs font-black uppercase tracking-widest", acknowledgement.status === 'understood' ? "text-green-700" : "text-amber-700")}>
                        {acknowledgement.status === 'understood' ? "Confirmed Understood" : "Needs Clarification"}
                     </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase underline p-0" onClick={() => onAcknowledge(acknowledgement.status === 'understood' ? 'clarify' : 'understood')}>Change</Button>
               </div>
             ) : (
               <div className="flex gap-2">
                 <Button 
                   className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[9px]"
                   onClick={() => onAcknowledge('understood')}
                 >
                   <ThumbsUp className="size-3 mr-2" />
                   I Understand
                 </Button>
                 <Button 
                   variant="outline"
                   className="flex-1 h-12 rounded-xl border-indigo-200 text-indigo-600 font-black uppercase tracking-widest text-[9px]"
                   onClick={() => onAcknowledge('clarify')}
                 >
                   <HelpCircle className="size-3 mr-2" />
                   Need Help
                 </Button>
               </div>
             )}
          </div>
        )}

        <div className="flex gap-2">
          <Sheet onOpenChange={(open) => open && onViewed()}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] border-primary/20">
                <Maximize2 className="size-3 mr-2" />
                View Full Details
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] rounded-t-[3rem] border-none shadow-2xl p-0">
              <ScrollArea className="h-full">
                <div className="max-w-lg mx-auto p-8 space-y-8">
                  <SheetHeader className="text-left space-y-4">
                     <div className="flex justify-between items-start">
                      <Badge className="bg-primary px-3 py-1 font-black uppercase text-[9px] tracking-widest">{notice.type}</Badge>
                      {!isOnline && <Badge variant="secondary" className="bg-amber-100 text-amber-600 uppercase text-[8px] font-black"><CloudOff className="size-2 mr-1" /> Offline View</Badge>}
                     </div>
                     <SheetTitle className={cn("font-black tracking-tight leading-tight text-primary", headingSizeClass === 'text-2xl' ? 'text-4xl' : 'text-3xl')}>
                      {notice.title}
                     </SheetTitle>
                     <SheetDescription className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-primary/5 pb-6">
                        <div className="flex items-center gap-1.5"><Calendar className="size-4 text-primary" /> {notice.date ? format(new Date(notice.date), "PPP") : "No Date"}</div>
                        <div className="flex items-center gap-1.5"><Clock className="size-4 text-primary" /> {notice.time || "TBD"}</div>
                     </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                         <Sparkles className="size-3" /> AI Simplified Message ({displayLanguage})
                      </h4>
                      <div className={cn(
                        "bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-inner",
                        userProfile.easyReadingMode ? "p-10 border-2" : "p-6"
                      )}>
                        <p className={cn(
                            "font-bold leading-relaxed text-foreground italic", 
                            userProfile.easyReadingMode && "leading-loose",
                            userProfile.textSize === 'large' ? 'text-2xl' : userProfile.textSize === 'medium' ? 'text-xl' : 'text-lg'
                        )}>
                          "{contentText}"
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-primary/5">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="w-full text-muted-foreground font-bold text-xs uppercase tracking-widest h-12 rounded-2xl hover:bg-muted/50">
                             View Original Formal Notice
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
                          <AlertDialogHeader className="space-y-4">
                            <AlertDialogTitle className="text-xl font-black text-foreground">Original School Message</AlertDialogTitle>
                            <AlertDialogDescription className="bg-muted/30 p-6 rounded-3xl text-sm font-medium leading-relaxed italic text-foreground/70 border border-primary/5">
                              {notice.originalMessage}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-6">
                            <AlertDialogAction className="h-14 rounded-2xl font-black uppercase tracking-widest bg-primary">Close</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90" onClick={onAskTeacher}>
                      <HelpCircle className="size-5 mr-2" />
                      Ask Teacher a Question
                  </Button>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          <Button className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" onClick={onAskTeacher}>
            <MessageCircle className="size-3 mr-2" />
            Ask Teacher
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
