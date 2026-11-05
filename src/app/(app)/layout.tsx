"use client";

import { BackButton } from "@/components/back-button";
import { History, LayoutDashboard, MessageCircle, Volume2, Pause, Loader2, User, Baby, Reply, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/footer";
import { useAppContext } from "@/hooks/use-app-context";
import { useState, useRef, useMemo, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { getTranslatedSpeech } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "@/components/settings-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationDrawer } from "@/components/notification-drawer";

const titles: { [key: string]: string } = {
  "/record": "",
  "/processing": "Processing",
  "/result": "Mediated Message",
  "/history": "Communication Logs",
  "/select-teacher": "Select Recipient",
  "/dashboard": "Dashboard",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, history, setSelectedTeacher, isOnline } = useAppContext();
  const { toast } = useToast();
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Sync animation handler
  useEffect(() => {
    setHasHydrated(true);
    if (isOnline) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const isRecordPage = pathname === '/record';
  const isProcessingPage = pathname === '/processing';
  const isDashboardPage = pathname === '/dashboard';
  
  const title = titles[pathname] || "SETU";

  const isTeacher = userProfile?.role === 'Teacher';
  const isParent = userProfile?.role === 'Parent';
  
  const studentMessages = useMemo(() => {
    return history.filter(c => c.receiverId === userProfile?.id && c.role === 'Child');
  }, [history, userProfile?.id]);

  const parentMessages = useMemo(() => {
    return history.filter(c => c.receiverId === userProfile?.id && c.role === 'Parent');
  }, [history, userProfile?.id]);

  const teacherResponses = useMemo(() => {
    return history.filter(c => c.receiverId === userProfile?.id && c.role === 'Teacher');
  }, [history, userProfile?.id]);

  const handlePlayAudio = async (messageId: string, text: string) => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Audio playback requires an internet connection.", variant: "destructive" });
      return;
    }
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setLoadingAudioId(messageId);
    try {
      const idToken = await userProfile?.id; // Placeholder as actual token comes from auth
      // In a real app we'd get current idToken from auth
      const lang = userProfile?.language || "English";
      const { audioDataUri } = await getTranslatedSpeech("dummy-token", text, lang);
      if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        audioRef.current.play();
        setPlayingId(messageId);
        audioRef.current.onended = () => setPlayingId(null);
      }
    } catch (error) {
      toast({ title: "Audio Error", description: "Could not play audio.", variant: "destructive" });
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleReplyAction = (msg: any) => {
    if (isTeacher) {
      router.push('/dashboard');
      toast({
        title: "Replying to " + msg.senderName,
        description: "Please use the dashboard reply section.",
      });
    } else {
      setSelectedTeacher({ 
        id: msg.senderId, 
        name: msg.senderName, 
        role: "Teacher",
        subtext: "Teacher", 
        secondaryText: "Setu Bharat"
      });
      router.push('/dashboard');
      toast({
        title: "Replying to " + msg.senderName,
        description: "Directing you to the mediated reply area.",
      });
    }
  };

  const MessageList = ({ messages }: { messages: any[] }) => (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 opacity-40 text-center px-4">
           <MessageCircle className="size-12 mb-2" />
           <p className="text-xs font-black uppercase tracking-widest leading-tight">No incoming messages at the moment.</p>
        </div>
      ) : messages.map((msg) => (
        <div key={msg.id} className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">
              {msg.senderName}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground">
              {msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : "Recent"}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground leading-snug mb-3 italic">"{msg.rephrased}"</p>
          <div className="flex gap-2">
            <Button 
              variant="secondary" size="sm" className="h-8 rounded-full text-[10px] font-bold flex items-center justify-center gap-2 flex-1"
              onClick={() => handlePlayAudio(msg.id, msg.rephrased)}
              disabled={loadingAudioId === msg.id}
            >
              {loadingAudioId === msg.id ? <Loader2 className="size-3 animate-spin" /> : playingId === msg.id ? <Pause className="size-3 fill-current" /> : <Volume2 className="size-3" />}
              {playingId === msg.id ? "Stop" : "Listen"}
            </Button>
            <Button 
              variant="default" size="sm" className="h-8 rounded-full text-[10px] font-bold flex items-center justify-center gap-2 flex-1"
              onClick={() => handleReplyAction(msg)}
            >
              <Reply className="size-3" />
              Reply
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("flex min-h-screen flex-col", isRecordPage && "bg-record-gradient")}>
      <audio ref={audioRef} className="hidden" />
      
      {/* Offline/Sync Banner - Guarded for Hydration */}
      {hasHydrated && !isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-1 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="size-3" />
            <span>Offline Mode</span>
          </div>
        </div>
      )}
      {hasHydrated && isOnline && showSyncSuccess && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-1 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-center flex items-center justify-center gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-3 animate-spin" />
            <span>Connection Restored</span>
          </div>
        </div>
      )}

      <header className={cn(
        "fixed left-0 right-0 z-50 h-16 safe-top transition-all duration-300",
        hasHydrated && (!isOnline || showSyncSuccess) ? "top-6" : "top-0",
        isRecordPage ? "bg-transparent" : "bg-background/80 backdrop-blur-md border-b"
      )}>
        <div className="mx-auto flex h-full max-w-md items-center justify-between px-4">
          <div className="w-1/4">
            <BackButton />
          </div>
          
          <div className="flex-grow flex justify-center text-center">
            {isRecordPage ? (
              <Select defaultValue="english">
                <SelectTrigger className="w-32 h-9 bg-white/60 border-none rounded-full px-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white active:scale-95">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="gujarati">Gujarati</SelectItem>
                  <SelectItem value="marathi">Marathi</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex flex-col items-center">
                <h1 className="text-sm font-black uppercase tracking-widest text-foreground truncate px-2">
                  {title}
                </h1>
                {hasHydrated && !isOnline && <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Offline Mode</span>}
              </div>
            )}
          </div>

          <div className="w-1/4 flex justify-end gap-1">
            {isParent && <NotificationDrawer />}
            
            {userProfile && !isProcessingPage && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full transition-all active:scale-90 hover:bg-primary/5">
                    <MessageCircle className="size-5 text-primary" />
                    {((isTeacher && (studentMessages.length > 0 || parentMessages.length > 0)) || (!isTeacher && teacherResponses.length > 0)) && (
                      <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-xs rounded-l-[2rem] border-none shadow-2xl p-0">
                  <SheetHeader className="p-6 border-b border-primary/5">
                    <SheetTitle className="text-sm font-black uppercase tracking-widest text-primary">
                      {isTeacher ? "Message Inboxes" : "Teacher Responses"}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)] px-4 py-6">
                    {isTeacher ? (
                      <Tabs defaultValue="students" className="w-full">
                        <TabsList className="grid grid-cols-2 bg-primary/5 rounded-full mb-6">
                          <TabsTrigger value="students" className="rounded-full text-[10px] font-black uppercase">Students</TabsTrigger>
                          <TabsTrigger value="parents" className="rounded-full text-[10px] font-black uppercase">Parents</TabsTrigger>
                        </TabsList>
                        <TabsContent value="students" className="mt-0">
                          <MessageList messages={studentMessages} />
                        </TabsContent>
                        <TabsContent value="parents" className="mt-0">
                          <MessageList messages={parentMessages} />
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <MessageList messages={teacherResponses} />
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            {!isRecordPage && !isProcessingPage && !isDashboardPage && (
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-full transition-all active:scale-90 hover:bg-primary/5">
                  <LayoutDashboard className="size-5 text-muted-foreground" />
              </Button>
            )}
            
            {!isRecordPage && !isProcessingPage && (
              <Button variant="ghost" size="icon" onClick={() => router.push('/history')} className="rounded-full transition-all active:scale-90 hover:bg-primary/5">
                  <History className="size-5 text-muted-foreground" />
              </Button>
            )}
            
            {!isProcessingPage && <SettingsDialog />}
          </div>
        </div>
      </header>

      <main className={cn("flex-1 flex flex-col items-center w-full", (hasHydrated && (!isOnline || showSyncSuccess)) ? "pt-20" : "pt-16")}>
        <div className="w-full max-w-md flex-1 flex flex-col px-4 min-h-0">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </div>
      </main>
    </div>
  );
}
