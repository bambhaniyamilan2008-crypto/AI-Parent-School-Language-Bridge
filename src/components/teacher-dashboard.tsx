"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "@/hooks/use-app-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  User, 
  MessageCircle, 
  Loader2, 
  School, 
  Baby, 
  Reply, 
  Inbox, 
  Sparkles, 
  Megaphone, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  ClipboardList, 
  ArrowLeft, 
  Eye, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Wand2,
  Copy,
  RotateCcw,
  Edit3,
  Languages,
  Check,
  Globe,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  Info,
  MessageSquareQuote,
  ArrowDownLeft,
  ChevronDown,
  Mic,
  Waves,
  PieChart,
  Target,
  UserCheck,
  UserMinus,
  CloudOff,
  RefreshCw,
  History,
  FileText,
  ThumbsUp,
  HelpCircle,
  ShieldAlert
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Conversation, NoticeStatus, SchoolNotice, AppNotification, NoticeAcknowledgement, NoticeAuditLog, AuditAction, IntegrityCheckResult } from "@/lib/types";
import { 
  simplifyMessageAction, 
  translateMultipleLanguagesAction, 
  translateSingleLanguageAction,
  generateAudioAction,
  transcribeAudioAction,
  checkContentIntegrityAction
} from "@/app/actions";
import { useFirestore, useUser, useCollection, useMemoFirebase, useAuth } from "@/firebase";
import { doc, setDoc, collection, query, where, onSnapshot, getDocs, writeBatch, orderBy, addDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NoticeAuditTimeline } from "./notice-audit-timeline";

const messageTypes = [
  "General Notice",
  "Parent-Teacher Meeting",
  "Attendance Notice",
  "Homework",
  "Examination",
  "School Holiday",
  "School Activity",
  "Important Announcement"
];

const classOptions = [
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
  "All Classes"
];

const recipientOptions = [
  "All Parents",
  "Selected Class Parents",
  "Individual Parent"
];

const TARGET_LANGUAGES = [
  "Gujarati", "Hindi", "English", "Marathi", "Tamil", "Telugu", "Bengali", "Kannada", "Malayalam", "Punjabi"
];

export function TeacherDashboard() {
  const { history, userProfile, sendReply, isOnline } = useAppContext();
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [currentView, setCurrentView] = useState<"overview" | "create-message" | "final-review" | "tracking" | "drafts">("overview");
  const [isPreview, setIsPreview] = useState(false);

  // Form State
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    title: "",
    type: "General Notice",
    message: "",
    targetClass: "All Classes",
    recipients: "All Parents",
    date: undefined as Date | undefined,
    time: "",
    createdAt: undefined as string | undefined,
    requireAcknowledgement: false,
  });

  const [replyText, setReplyText] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Engagement State
  const [selectedNoticeForTracking, setSelectedNoticeForTracking] = useState<SchoolNotice | null>(null);

  // Voice Chat State
  const { status: recordStatus, startRecording, stopRecording, resetRecording, audioDataUri, analyser } = useAudioRecorder();
  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  // Translation Preview State
  const [showReplyTranslationPreview, setShowReplyTranslationPreview] = useState(false);
  const [translatedReplyText, setTranslatedReplyText] = useState("");
  const [isTranslatingReply, setIsTranslatingReply] = useState(false);
  const [isEditingReplyTranslation, setIsEditingReplyTranslation] = useState(false);

  // AI Simplification State
  const [simplifiedMessage, setSimplifiedMessage] = useState("");
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [isEditingSimplified, setIsEditingSimplified] = useState(false);

  // AI Translation State
  const [selectedTargetLanguages, setSelectedTargetLanguages] = useState<string[]>([]);
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [editingTranslationLang, setEditingTranslationLang] = useState<string | null>(null);

  // TTS State
  const [audioUris, setAudioUris] = useState<{ [key: string]: string }>({});
  const [generatingAudioLang, setGeneratingAudioLang] = useState<string | null>(null);

  // Integrity Check State
  const [simplifiedIntegrity, setSimplifiedIntegrity] = useState<IntegrityCheckResult | null>(null);
  const [translationIntegrity, setTranslationIntegrity] = useState<{ [lang: string]: IntegrityCheckResult }>({});
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

  // Checklist State
  const [checklist, setChecklist] = useState({
    original: false,
    simplified: false,
    translations: false,
    dates: false,
    names: false,
    audio: false,
  });

  const [isSavingNotice, setIsSavingNotice] = useState(false);

  const allIncoming = useMemo(() => {
    return history.filter(
      (conv) => conv.receiverId === userProfile?.id && conv.role !== 'Teacher'
    ).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [history, userProfile?.id]);

  const studentMessages = allIncoming.filter(m => m.role === 'Child');
  const parentMessages = allIncoming.filter(m => m.role === 'Parent');

  const selectedConversation = allIncoming.find(m => m.id === selectedConversationId);

  // Language display toggles for inbox
  const [messageViewLangs, setMessageViewLangs] = useState<{ [msgId: string]: 'original' | 'translated' }>({});

  const toggleMsgLang = (id: string) => {
    setMessageViewLangs(prev => ({
      ...prev,
      [id]: prev[id] === 'translated' ? 'original' : 'translated'
    }));
  };

  // Fetch approved notices for tracking
  const approvedNoticesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "school_notices"),
      where("teacherId", "==", user.uid),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: myApprovedNotices } = useCollection<SchoolNotice>(approvedNoticesQuery);

  // Fetch draft notices for drafts tab
  const draftsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "school_notices"),
      where("teacherId", "==", user.uid),
      where("status", "==", "draft"),
      orderBy("createdAt", "desc")
    );
  }, [db, user]);

  const { data: myDrafts, hasPendingWrites: hasDraftWrites } = useCollection<SchoolNotice>(draftsQuery);

  // Fetch Acknowledgements for tracking
  const acknowledgementsQuery = useMemoFirebase(() => {
    if (!selectedNoticeForTracking?.id) return null;
    return query(
      collection(db, "notice_acknowledgements"),
      where("noticeId", "==", selectedNoticeForTracking.id)
    );
  }, [db, selectedNoticeForTracking?.id]);

  const { data: acks } = useCollection<NoticeAcknowledgement>(acknowledgementsQuery);

  const ackStats = useMemo(() => {
    if (!acks) return { understood: 0, clarify: 0 };
    return {
      understood: acks.filter(a => a.status === 'understood').length,
      clarify: acks.filter(a => a.status === 'clarify').length,
    };
  }, [acks]);

  /** Helper to create audit logs */
  const logNoticeAction = useCallback(async (noticeId: string, title: string, action: AuditAction, metadata?: any) => {
    if (!user || !userProfile) return;
    
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const logData: NoticeAuditLog = {
      id: logId,
      noticeId,
      noticeTitle: title,
      action,
      actorId: user.uid,
      actorName: userProfile.name,
      actorRole: userProfile.role,
      timestamp: new Date().toISOString(),
      schoolName: userProfile.schoolName || "Unknown School",
      metadata
    };

    try {
      await setDoc(doc(db, "notice_audit_logs", logId), logData);
    } catch (e) {
      console.error("Failed to write audit log", e);
    }
  }, [db, user, userProfile]);

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
          if (!idToken) throw new Error("User identification failed.");
          
          const text = await transcribeAudioAction(idToken, audioDataUri);
          setReplyText(text);
          setShowTranscriptReview(true);
        } catch (error: any) {
          toast({ title: "Transcription Error", description: error.message || "Could not understand speech.", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
          resetRecording();
        }
      };
      transcribe();
    }
  }, [audioDataUri, isRecordingChat, isTranscribing, resetRecording, auth, toast]);

  const handleConfirmTranscript = () => {
    setReplyText(transcribedText);
    setShowTranscriptReview(false);
  };

  const handleInitiateReplyTranslation = async () => {
    if (!selectedConversation || !replyText.trim() || !userProfile?.id) return;
    
    if (!isOnline) {
        toast({ title: "Internet Required", description: "AI Translation requires an active internet connection.", variant: "destructive" });
        return;
    }

    const targetLang = selectedConversation.senderLanguage || "English";
    
    if (targetLang.toLowerCase() === 'english') {
      handleSendReply();
      return;
    }

    setIsTranslatingReply(true);
    setShowReplyTranslationPreview(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized.");
      
      const translated = await translateSingleLanguageAction(idToken, replyText, targetLang);
      setTranslatedReplyText(translated);
    } catch (error: any) {
      toast({ title: "Translation Error", description: error.message || "Could not translate reply.", variant: "destructive" });
      setTranslatedReplyText(replyText); 
    } finally {
      setIsTranslatingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setIsSending(true);
    try {
      await sendReply(
        selectedConversation.senderId, 
        selectedConversation.senderName, 
        replyText,
        selectedConversation.noticeId,
        selectedConversation.noticeTitle,
        translatedReplyText || undefined,
        selectedConversation.senderLanguage
      );
      setReplyText("");
      setTranslatedReplyText("");
      setSelectedConversationId(null);
      setShowReplyTranslationPreview(false);
      toast({
        title: isOnline ? "Reply Sent" : "Message Queued",
        description: isOnline 
            ? `Your response has been sent to ${selectedConversation.senderName}.` 
            : `You are offline. Message will be sent automatically once restored.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast({ title: "Title Required", description: "Please enter a school notice title.", variant: "destructive" });
      return false;
    }
    if (!form.message.trim()) {
      toast({ title: "Message Required", description: "Please write the official school message.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setIsPreview(true);
      setShowComparison(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    await saveNoticeToFirestore("draft");
  };

  const handleApproveNotice = async () => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "Official approval requires an internet connection.", variant: "destructive" });
      return;
    }

    const isAllChecked = Object.entries(checklist).every(([key, val]) => {
      if (key === 'audio' && Object.keys(audioUris).length === 0) return true;
      return val;
    });

    if (!isAllChecked) {
      toast({ title: "Checklist Incomplete", description: "Please verify all items before approval.", variant: "destructive" });
      return;
    }

    await saveNoticeToFirestore("approved");
  };

  const saveNoticeToFirestore = async (status: NoticeStatus) => {
    if (!user) return;
    
    setIsSavingNotice(true);
    const isNew = !form.id;
    const noticeId = form.id || `notice-${Date.now()}`;
    const noticeData: SchoolNotice = {
      id: noticeId,
      teacherId: user.uid,
      teacherName: userProfile?.name || "Teacher",
      schoolName: userProfile?.schoolName || "Unknown School",
      title: form.title,
      type: form.type,
      targetClass: form.targetClass,
      recipients: form.recipients,
      date: form.date?.toISOString(),
      time: form.time,
      originalMessage: form.message,
      simplifiedMessage: simplifiedMessage || form.message,
      translations: translations,
      audioUris: audioUris,
      status: status,
      createdAt: form.createdAt || new Date().toISOString(),
      approvedAt: status === "approved" ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      requireAcknowledgement: form.requireAcknowledgement,
      integrityResults: {
        simplified: simplifiedIntegrity || undefined,
        translations: translationIntegrity
      }
    };

    try {
      const noticeRef = doc(db, "school_notices", noticeId);
      const action: AuditAction = isNew ? 'created' : (status === 'approved' ? 'approved' : 'updated');
      await setDoc(noticeRef, noticeData);
      await logNoticeAction(noticeId, form.title, action, { status, isNew, ackRequired: form.requireAcknowledgement });

      if (status === "approved") {
        await generateNotificationsForParents(noticeData);
      }
      
      toast({
        title: status === "approved" ? "Official Notice Approved" : (isOnline ? "Draft Saved" : "Saved Locally"),
        description: status === "approved" 
          ? "The notice is now securely stored and notifications sent." 
          : "Your changes are saved.",
      });

      setCurrentView("overview");
      resetForm();
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `school_notices/${noticeId}`,
        operation: 'create',
        requestResourceData: noticeData
      }));
    } finally {
      setIsSavingNotice(false);
    }
  };

  const resetForm = () => {
    setForm({ id: undefined, title: "", type: "General Notice", message: "", targetClass: "All Classes", recipients: "All Parents", date: undefined, time: "", createdAt: undefined, requireAcknowledgement: false });
    setSimplifiedMessage("");
    setTranslations({});
    setAudioUris({});
    setSimplifiedIntegrity(null);
    setTranslationIntegrity({});
    setShowComparison(false);
    setIsPreview(false);
    setChecklist({ original: false, simplified: false, translations: false, dates: false, names: false, audio: false });
  };

  const handleEditDraft = (draft: SchoolNotice) => {
    setForm({
      id: draft.id,
      title: draft.title,
      type: draft.type,
      message: draft.originalMessage,
      targetClass: draft.targetClass,
      recipients: draft.recipients,
      date: draft.date ? new Date(draft.date) : undefined,
      time: draft.time || "",
      createdAt: draft.createdAt,
      requireAcknowledgement: draft.requireAcknowledgement || false,
    });
    setSimplifiedMessage(draft.simplifiedMessage);
    setTranslations(draft.translations || {});
    setAudioUris(draft.audioUris || {});
    setSimplifiedIntegrity(draft.integrityResults?.simplified || null);
    setTranslationIntegrity(draft.integrityResults?.translations || {});
    setCurrentView("create-message");
    toast({ title: "Draft Loaded" });
  };

  const generateNotificationsForParents = async (notice: SchoolNotice) => {
    try {
      let parentsQuery;
      if (notice.recipients === "All Parents") {
        parentsQuery = query(collection(db, "parents"));
      } else if (notice.recipients === "Selected Class Parents") {
        parentsQuery = query(collection(db, "parents"), where("childClass", "==", notice.targetClass));
      } else {
        parentsQuery = query(collection(db, "parents"), where("userId", "==", "demo-parent-id"));
      }

      const snapshot = await getDocs(parentsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(pDoc => {
        const parentId = pDoc.id;
        const notifId = `notif-${notice.id}-${parentId}`;
        const notifRef = doc(db, "notifications", notifId);
        
        const notifData: AppNotification = {
          id: notifId,
          parentUid: parentId,
          noticeId: notice.id,
          title: notice.title,
          type: notice.type,
          messagePreview: notice.simplifiedMessage.substring(0, 100) + "...",
          createdAt: new Date().toISOString(),
          isRead: false,
          teacherName: notice.teacherName,
          schoolName: notice.schoolName
        };
        
        batch.set(notifRef, notifData);
      });

      await batch.commit();
    } catch (e) {
      console.error("Notification generation failed", e);
    }
  };

  const handleSimplifyWithAI = async () => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "AI Simplification requires internet.", variant: "destructive" });
      return;
    }
    if (!form.message.trim()) return;

    setIsSimplifying(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized.");
      
      const result = await simplifyMessageAction(idToken, form.message);
      setSimplifiedMessage(result.simplifiedMessage);
      setShowComparison(true);
      setIsPreview(false);
      
      const integrity = await checkContentIntegrityAction(idToken, form.message, result.simplifiedMessage, 'simplification');
      setSimplifiedIntegrity(integrity);
      
      toast({ title: "Success", description: "Message simplified." });
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message || "Could not simplify.", variant: "destructive" });
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleTranslateWithAI = async () => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "AI Translation requires internet.", variant: "destructive" });
      return;
    }
    if (selectedTargetLanguages.length === 0) return;

    const sourceText = simplifiedMessage || form.message;
    setIsTranslating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized.");
      
      const results = await translateMultipleLanguagesAction(idToken, sourceText, selectedTargetLanguages);
      const newTranslations = { ...translations };
      const newIntegrity = { ...translationIntegrity };

      for (const res of results) {
        newTranslations[res.lang] = res.text;
        const integrity = await checkContentIntegrityAction(idToken, sourceText, res.text, 'translation', res.lang);
        newIntegrity[res.lang] = integrity;
      }
      
      setTranslations(newTranslations);
      setTranslationIntegrity(newIntegrity);
      toast({ title: "Translation Complete" });
    } catch (error: any) {
      toast({ title: "Translation Error", description: error.message || "Failed to translate.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateAudio = async (lang: string, text: string) => {
    if (!isOnline) {
      toast({ title: "Internet Required", description: "Voice generation requires internet.", variant: "destructive" });
      return;
    }
    if (generatingAudioLang === lang) return;
    
    setGeneratingAudioLang(lang);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized.");
      
      const { audioDataUri } = await generateAudioAction(idToken, text, lang);
      setAudioUris(prev => ({ ...prev, [lang]: audioDataUri }));
      toast({ title: "Audio Ready" });
    } catch (error: any) {
      toast({ title: "Audio Error", description: error.message || "Failed to generate audio.", variant: "destructive" });
    } finally {
      setGeneratingAudioLang(null);
    }
  };

  const MessageList = ({ messages, emptyLabel }: { messages: Conversation[], emptyLabel: string }) => (
    <ScrollArea className="h-[450px] px-2 py-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center opacity-40">
          <Inbox className="size-12 mb-2" />
          <p className="text-sm font-bold uppercase tracking-widest">{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-6 pr-4">
          {messages.map((msg) => {
            const isViewingTranslated = messageViewLangs[msg.id] === 'translated';
            const hasTranslation = !!msg.translatedText;
            const displayContent = isViewingTranslated ? msg.translatedText : msg.rephrased;
            const displayLang = isViewingTranslated ? msg.translatedLanguage : (msg.senderLanguage || "English");

            return (
              <div
                key={msg.id}
                className={cn(
                  "w-full text-left p-5 rounded-[2rem] border transition-all duration-300 relative group cursor-pointer",
                  selectedConversationId === msg.id
                    ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-lg"
                    : "bg-white/40 border-primary/5 hover:bg-white/60 shadow-sm"
                )}
                onClick={() => setSelectedConversationId(msg.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl shadow-sm",
                      msg.role === 'Parent' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {msg.role === 'Parent' ? <User className="size-4" /> : <Baby className="size-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-tight text-foreground/80">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {msg.role} {msg.senderClass ? `• Class ${msg.senderClass}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                      {msg.timestamp ? formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true }) : "Just now"}
                    </span>
                    {msg.senderLanguage && (
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/10 bg-primary/5 text-primary py-0 h-4">
                        Prefers: {msg.senderLanguage}
                      </Badge>
                    )}
                  </div>
                </div>

                {msg.noticeTitle && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-primary/5 rounded-xl text-primary/70 max-w-fit">
                    <MessageSquareQuote className="size-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[200px]">RE: {msg.noticeTitle}</span>
                  </div>
                )}

                <div className="space-y-3 relative">
                  <div className="bg-white/40 p-4 rounded-2xl border border-primary/5 italic text-base font-bold text-foreground leading-snug">
                    "{displayContent}"
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                       <Globe className="size-3 text-primary/40" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                         {isViewingTranslated ? "AI Translated" : "Mediated English"} • {displayLang}
                       </span>
                    </div>
                    {hasTranslation && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-full"
                        onClick={(e) => { e.stopPropagation(); toggleMsgLang(msg.id); }}
                      >
                         {isViewingTranslated ? "View Original English" : `View ${msg.senderLanguage} Original`}
                      </Button>
                    )}
                  </div>
                </div>

                {selectedConversationId === msg.id && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                    <div className="bg-primary p-1 rounded-full shadow-lg">
                      <ArrowRight className="size-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  const AudioPlayer = ({ audioUri, lang }: { audioUri: string, lang: string }) => {
    const audioRef = useRef<HTMLAnchorElement | any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const updateTime = () => setCurrentTime(audio.currentTime);
      const setAudioData = () => setDuration(audio.duration);
      audio.addEventListener("timeupdate", updateTime);
      audio.addEventListener("loadedmetadata", setAudioData);
      audio.addEventListener("ended", () => setIsPlaying(false));
      return () => {
        audio.removeEventListener("timeupdate", updateTime);
        audio.removeEventListener("loadedmetadata", setAudioData);
      };
    }, []);

    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
      }
    };

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
      <div className="flex items-center gap-4 bg-primary/5 p-3 rounded-2xl border border-primary/10 animate-fade-in">
        <audio ref={audioRef} src={audioUri} />
        <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shrink-0 shadow-sm" onClick={togglePlay}>
          {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
        </Button>
        <div className="flex-1 space-y-1.5">
          <Slider value={[currentTime]} max={duration || 100} step={0.1} className="cursor-pointer" onValueChange={(v) => { if (audioRef.current) audioRef.current.currentTime = v[0]; }} />
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary/60 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    );
  };

  const IntegrityReport = ({ result }: { result: IntegrityCheckResult | null }) => {
    if (!result) return null;
    
    return (
      <div className={cn(
        "p-4 rounded-2xl border-2 transition-all animate-fade-in",
        result.status === 'clean' ? "bg-green-50 border-green-100" : 
        result.status === 'unavailable' ? "bg-muted/50 border-muted" : "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
              {result.status === 'clean' ? <CheckCircle2 className="size-4 text-green-600" /> : 
               result.status === 'unavailable' ? <Info className="size-4 text-muted-foreground" /> : <ShieldAlert className="size-4 text-amber-600" />}
              <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                result.status === 'clean' ? "text-green-700" : 
                result.status === 'unavailable' ? "text-muted-foreground" : "text-amber-700")}>
                {result.status === 'clean' ? "No Potential Issues Detected" : 
                 result.status === 'unavailable' ? "Integrity Check Unavailable" : "Potential Information Mismatch"}
              </span>
           </div>
           {result.issues.length > 0 && (
             <Badge variant="outline" className="text-[8px] font-black uppercase bg-white border-amber-200 text-amber-600">{result.issues.length} Warnings</Badge>
           )}
        </div>
        
        {result.issues.length > 0 && (
          <div className="space-y-3 mt-4">
             {result.issues.map((issue, idx) => (
               <div key={issue.originalValue + idx} className="bg-white/80 p-3 rounded-xl border border-amber-100 space-y-2">
                  <div className="flex items-center gap-2">
                     <Badge variant="neutral" className="bg-amber-100 text-amber-800 text-[7px] h-3 uppercase font-black">{issue.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 py-1">
                     <div className="space-y-0.5">
                        <p className="text-[7px] font-black uppercase text-muted-foreground">Original</p>
                        <p className="text-[11px] font-bold text-muted-foreground line-clamp-1">{issue.originalValue}</p>
                     </div>
                     <div className="space-y-0.5">
                        <p className="text-[7px] font-black uppercase text-amber-600">Simplified/Translated</p>
                        <p className="text-[11px] font-bold text-amber-900 line-clamp-1">{issue.targetValue}</p>
                     </div>
                  </div>
                  <p className="text-[10px] font-medium text-amber-800/80 leading-tight italic">"{issue.explanation}"</p>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-primary/10 shadow-sm sticky top-0 z-40">
        <Button variant={currentView === "overview" ? "default" : "ghost"} className={cn("rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[10px] flex-1")} onClick={() => setCurrentView("overview")}>
          <LayoutDashboard className="size-3 mr-2" />
          Inbox
        </Button>
        <Button variant={currentView === "drafts" ? "default" : "ghost"} className={cn("rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[10px] flex-1")} onClick={() => { setCurrentView("drafts"); setSelectedNoticeForTracking(null); }}>
          <FileText className="size-3 mr-2" />
          Drafts
          {myDrafts && myDrafts.length > 0 && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />}
        </Button>
        <Button variant={currentView === "tracking" ? "default" : "ghost"} className={cn("rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[10px] flex-1")} onClick={() => setCurrentView("tracking")}>
          <Target className="size-3 mr-2" />
          Engagement
        </Button>
        <Button variant={currentView === "create-message" ? "default" : "ghost"} className={cn("rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[10px] flex-1")} onClick={() => { setCurrentView("create-message"); resetForm(); }}>
          <Megaphone className="size-3 mr-2" />
          Create
        </Button>
      </div>

      {currentView === "overview" ? (
        <>
          <header className="text-center space-y-1 py-4 border-b border-primary/10">
            <h2 className="text-2xl font-black tracking-tight text-primary uppercase tracking-widest">SETU Bharat COMMUNICATION</h2>
          </header>

          <section className="space-y-4">
            <Tabs defaultValue="parents" className="w-full">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    1️⃣ Message Inbox
                </h3>
                <TabsList className="bg-primary/5 rounded-full h-10 p-1">
                  <TabsTrigger value="parents" className="rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all">
                    Parents ({parentMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="students" className="rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all">
                    Students ({studentMessages.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <Card className="border-primary/10 shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden">
                <CardContent className="p-4">
                  <TabsContent value="students" className="m-0 border-none p-0">
                    <MessageList messages={studentMessages} emptyLabel="No student messages yet" />
                  </TabsContent>
                  <TabsContent value="parents" className="m-0 border-none p-0">
                    <MessageList messages={parentMessages} emptyLabel="No parent messages available yet." />
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </section>

          <section className="space-y-4 pt-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                2️⃣ Constructive Reply
            </h3>
            <Card className="border-primary/20 border-2 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white ring-8 ring-primary/5">
                <CardHeader className="bg-primary/5 px-6 py-4 border-b border-primary/10">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4" />
                            {selectedConversation 
                                ? `Replying to: ${selectedConversation.senderName}` 
                                : "Select a message to respond"}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="relative">
                      <Textarea
                          placeholder={selectedConversationId 
                              ? `Type or record your response...` 
                              : "Please select a message above to start your reply."}
                          className="min-h-[140px] rounded-2xl border-primary/10 bg-primary/5 focus:bg-white transition-all text-base font-medium p-4 pr-12"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          disabled={!selectedConversationId}
                      />
                      {selectedConversationId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-3 top-3 h-10 w-10 rounded-full bg-white shadow-sm border border-primary/5 text-primary hover:bg-primary hover:text-white"
                          onClick={handleStartVoiceChat}
                          disabled={isTranscribing}
                        >
                          {isTranscribing ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
                        </Button>
                      )}
                    </div>
                    
                    <Button
                        className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98] bg-primary hover:bg-primary/90"
                        disabled={!selectedConversationId || !replyText.trim() || isSending}
                        onClick={handleInitiateReplyTranslation}
                    >
                        {isSending ? <Loader2 className="animate-spin" /> : (
                        <>
                            Send Response
                            <Send className="ml-3 size-5" />
                        </>
                        )}
                    </Button>

                    <AlertDialog open={showReplyTranslationPreview} onOpenChange={setShowReplyTranslationPreview}>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-lg">
                           <AlertDialogHeader className="space-y-4">
                              <div className="mx-auto bg-indigo-100 p-4 rounded-3xl">
                                 <Languages className="size-8 text-indigo-600" />
                              </div>
                              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-center">AI Translation Preview</AlertDialogTitle>
                           </AlertDialogHeader>
                           <div className="space-y-6 mt-6">
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Your Original (English)</Label>
                                 <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 italic text-sm font-medium opacity-60">"{replyText}"</div>
                              </div>
                              <div className="space-y-2">
                                 <div className="flex justify-between items-center ml-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">AI Translated ({selectedConversation?.senderLanguage})</Label>
                                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase text-indigo-600" onClick={() => setIsEditingReplyTranslation(!isEditingReplyTranslation)}>{isEditingReplyTranslation ? "Done" : "Edit"}</Button>
                                 </div>
                                 {isTranslatingReply ? (
                                    <div className="h-32 flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-pulse">
                                       <Loader2 className="size-6 text-indigo-400 animate-spin mb-2" />
                                    </div>
                                 ) : isEditingReplyTranslation ? (
                                    <Textarea className="min-h-[120px] bg-white border-indigo-200 text-base font-bold italic p-4 rounded-2xl" value={translatedReplyText} onChange={(e) => setTranslatedReplyText(e.target.value)} />
                                 ) : (
                                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-lg font-bold text-indigo-900 leading-snug">"{translatedReplyText}"</div>
                                 )}
                              </div>
                           </div>
                           <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-8">
                              <AlertDialogCancel className="h-14 rounded-2xl font-bold flex-1">Back</AlertDialogCancel>
                              <AlertDialogAction onClick={handleSendReply} className="h-14 rounded-2xl font-black uppercase tracking-widest flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isSending || isTranslatingReply}>Confirm & Send</AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
          </section>
        </>
      ) : currentView === "drafts" ? (
        <div className="animate-fade-in space-y-6">
          <header className="text-center space-y-1 py-4">
             <h2 className="text-3xl font-black tracking-tighter text-primary uppercase">LOCAL DRAFTS</h2>
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
               {isOnline ? "All drafts synchronized" : "Drafts saved on this device"}
             </p>
          </header>
          
          <div className="space-y-4">
            {(!myDrafts || myDrafts.length === 0) ? (
              <Card className="border-dashed border-2 border-primary/10 bg-primary/5 p-12 rounded-[2.5rem] text-center">
                <FileText className="size-16 mx-auto text-primary opacity-20 mb-4" />
                <h3 className="text-xl font-black text-foreground">No drafts found</h3>
                <p className="text-xs text-muted-foreground font-medium mt-2">Drafts saved while offline will appear here.</p>
              </Card>
            ) : (
              myDrafts.map((draft) => (
                <Card key={draft.id} className="rounded-3xl border-primary/5 bg-white/60 backdrop-blur-md overflow-hidden shadow-sm group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                       <div className="space-y-1">
                          <Badge variant="secondary" className="text-[8px] font-black uppercase">{draft.type}</Badge>
                          <h4 className="text-lg font-black text-foreground leading-tight">{draft.title}</h4>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <History className="size-3" />
                            Edited {formatDistanceToNow(new Date(draft.updatedAt || draft.createdAt), { addSuffix: true })}
                          </p>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                         {hasDraftWrites ? (
                           <Badge className="bg-amber-500 text-white animate-pulse text-[8px] uppercase font-black tracking-widest">
                             <RefreshCw className="size-2 mr-1 animate-spin" /> Pending Sync
                           </Badge>
                         ) : (
                           <Badge className="bg-green-100 text-green-700 text-[8px] uppercase font-black tracking-widest">
                             <CheckCircle2 className="size-2 mr-1" /> Synced
                           </Badge>
                         )}
                         <div className="flex gap-2">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase border-primary/10">
                                        <History className="size-3 mr-1" /> History
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="rounded-l-[2rem] p-10 border-none shadow-2xl w-full max-w-lg">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                            <History className="size-5 text-primary" /> Notice History
                                        </SheetTitle>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{draft.title}</p>
                                    </SheetHeader>
                                    <NoticeAuditTimeline noticeId={draft.id} />
                                </SheetContent>
                            </Sheet>
                            <Button size="sm" className="h-8 rounded-full text-[10px] font-black uppercase bg-primary" onClick={() => handleEditDraft(draft)}>
                                Resume Editing
                            </Button>
                         </div>
                       </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground line-clamp-2 italic">"{draft.originalMessage}"</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : currentView === "tracking" ? (
        <div className="animate-fade-in space-y-6">
          <header className="text-center space-y-1 py-4">
             <h2 className="text-3xl font-black tracking-tighter text-primary">NOTICE ENGAGEMENT</h2>
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Track delivery and parent views</p>
          </header>
          <div className="space-y-6">
            <div className="flex items-center gap-4 overflow-x-auto pb-4 px-1">
              {myApprovedNotices?.map(notice => (
                <Card 
                  key={notice.id} 
                  className={cn(
                    "min-w-[200px] p-4 cursor-pointer transition-all rounded-[1.5rem]",
                    selectedNoticeForTracking?.id === notice.id ? "bg-primary border-primary ring-4 ring-primary/10" : "bg-white/60 hover:bg-white"
                  )}
                  onClick={() => setSelectedNoticeForTracking(notice)}
                >
                  <h4 className={cn("text-xs font-black uppercase truncate", selectedNoticeForTracking?.id === notice.id ? "text-white" : "text-primary")}>
                    {notice.title}
                  </h4>
                  <p className={cn("text-[9px] font-bold mt-1", selectedNoticeForTracking?.id === notice.id ? "text-white/60" : "text-muted-foreground")}>
                    {format(new Date(notice.createdAt), "MMM d, yyyy")}
                  </p>
                </Card>
              ))}
            </div>

            {selectedNoticeForTracking && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center px-1">
                   <h3 className="text-sm font-black uppercase text-primary tracking-widest">{selectedNoticeForTracking.title}</h3>
                   <Sheet>
                      <SheetTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 rounded-full text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                              <History className="size-3 mr-1" /> View History
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="rounded-l-[2rem] p-10 border-none shadow-2xl w-full max-w-lg">
                          <SheetHeader className="mb-6">
                              <SheetTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                  <History className="size-5 text-primary" /> Notice History
                              </SheetTitle>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{selectedNoticeForTracking.title}</p>
                          </SheetHeader>
                          <NoticeAuditTimeline noticeId={selectedNoticeForTracking.id} />
                      </SheetContent>
                  </Sheet>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="rounded-[2rem] border-none bg-indigo-50 p-6 text-center">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Understood</p>
                    <div className="flex items-center justify-center gap-2">
                       <ThumbsUp className="size-5 text-indigo-600" />
                       <h3 className="text-4xl font-black text-indigo-900">{ackStats.understood}</h3>
                    </div>
                  </Card>
                  <Card className="rounded-[2rem] border-none bg-amber-50 p-6 text-center">
                    <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Need Clarification</p>
                    <div className="flex items-center justify-center gap-2">
                       <HelpCircle className="size-5 text-amber-600" />
                       <h3 className="text-4xl font-black text-amber-900">{ackStats.clarify}</h3>
                    </div>
                  </Card>
                </div>
                
                {acks && acks.length > 0 && (
                  <Card className="rounded-[2.5rem] border-primary/5 bg-white/60 backdrop-blur-md overflow-hidden">
                    <CardHeader className="p-6 border-b border-primary/5">
                       <CardTitle className="text-xs font-black uppercase text-primary tracking-widest">Recent Responses</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <ScrollArea className="h-64">
                          <div className="divide-y divide-primary/5">
                             {acks.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(ack => (
                               <div key={ack.id} className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("p-1.5 rounded-lg", ack.status === 'understood' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600")}>
                                        {ack.status === 'understood' ? <CheckCircle2 className="size-3.5" /> : <HelpCircle className="size-3.5" />}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-xs font-bold">{ack.parentName}</span>
                                        <span className="text-[9px] font-medium text-muted-foreground">{formatDistanceToNow(new Date(ack.timestamp), { addSuffix: true })}</span>
                                     </div>
                                  </div>
                                  <Badge variant={ack.status === 'understood' ? "neutral" : "outline"} className={cn("text-[8px] font-black uppercase", ack.status === 'understood' ? "bg-green-50 text-white" : "border-amber-500 text-amber-600")}>
                                     {ack.status}
                                  </Badge>
                               </div>
                             ))}
                          </div>
                       </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      ) : currentView === "create-message" ? (
        <div className="animate-fade-in space-y-6">
          {!isPreview && !showComparison ? (
            <>
              <header className="text-center space-y-2 py-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                   <Megaphone className="size-6 text-primary" />
                   <h2 className="text-3xl font-black tracking-tighter text-primary uppercase">SCHOOL MESSAGE</h2>
                </div>
                {!isOnline && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] uppercase font-black px-3 py-1">
                    <CloudOff className="size-3 mr-2" /> Offline Mode Enabled
                  </Badge>
                )}
              </header>
              <Card className="border-primary/10 shadow-2xl rounded-[2.5rem] bg-white/80 backdrop-blur-xl overflow-hidden border-2">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Message Title</Label>
                    <Input placeholder="Enter title" className="h-12 rounded-xl font-bold bg-primary/5" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Type</Label>
                      <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                        <SelectTrigger className="h-12 rounded-xl font-bold bg-primary/5"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">{messageTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Class</Label>
                      <Select value={form.targetClass} onValueChange={(v) => setForm({...form, targetClass: v})}>
                        <SelectTrigger className="h-12 rounded-xl font-bold bg-primary/5"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">{classOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Original Message</Label>
                    <Textarea placeholder="Write notice here..." className="min-h-[160px] rounded-2xl bg-primary/5 p-4 text-base font-medium" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="space-y-0.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Require Acknowledgement</Label>
                       <p className="text-[9px] font-medium text-muted-foreground">Confirm understood.</p>
                    </div>
                    <Switch 
                       checked={form.requireAcknowledgement} 
                       onCheckedChange={(checked) => setForm({ ...form, requireAcknowledgement: checked })} 
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Button 
                              className="w-full h-16 rounded-2xl font-black uppercase text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white" 
                              disabled={!form.message.trim() || isSimplifying || !isOnline} 
                              onClick={handleSimplifyWithAI}
                            >
                              {isSimplifying ? "Simplifying..." : "✨ Simplify with AI"}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!isOnline && <TooltipContent>Internet required for AI Simplification</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>

                    <div className="grid grid-cols-2 gap-3">
                       <Button variant="outline" className="h-14 rounded-2xl font-black uppercase text-[10px] border-primary/20" onClick={handleSaveDraft}>
                         <Save className="size-4 mr-2" /> {isOnline ? "Save Draft" : "Save Locally"}
                       </Button>
                       <Button className="h-14 rounded-2xl font-black uppercase text-[10px] bg-primary" onClick={handlePreview}>
                         <Eye className="size-4 mr-2" /> Preview
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : isPreview ? (
            <div className="animate-fade-in space-y-8">
              <Button variant="ghost" onClick={() => setIsPreview(false)} className="text-xs font-black uppercase text-primary flex items-center gap-2">
                 <ArrowLeft className="size-3" /> Back to Edit
              </Button>
              <Card className="border-primary/20 border-2 shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-8 space-y-8">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <Badge className="bg-primary">{form.type}</Badge>
                      <CardTitle className="text-3xl font-black">{form.title}</CardTitle>
                   </div>
                   {!isOnline && <Badge variant="secondary" className="bg-amber-100 text-amber-600 uppercase text-[8px] font-black"><CloudOff className="size-2 mr-1" /> Offline Preview</Badge>}
                </div>
                <div className="bg-primary/5 p-6 rounded-3xl italic text-lg leading-relaxed">"{form.message}"</div>
                
                {form.requireAcknowledgement && (
                  <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                     <CheckCircle2 className="size-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Parent Acknowledgement Required</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                   <Button className="w-full h-16 rounded-2xl font-black uppercase bg-primary" onClick={() => setIsPreview(false)}>Continue Editing</Button>
                </div>
              </Card>
            </div>
          ) : (
            <div className="animate-fade-in space-y-12">
              <Button variant="ghost" onClick={() => setShowComparison(false)} className="text-xs font-black uppercase text-primary">Back to Builder</Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 rounded-3xl space-y-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Original Notice</p>
                  <p className="text-sm font-medium opacity-70 leading-relaxed">{form.message}</p>
                </Card>
                <Card className="border-indigo-200 border-2 p-6 space-y-4 rounded-3xl">
                  <div className="flex justify-between items-center mb-2">
                     <p className="text-[10px] font-black uppercase text-indigo-600">AI Simplified Version</p>
                     {!isOnline && <Badge variant="neutral" className="bg-amber-100 text-amber-600 text-[8px] uppercase font-black px-2">Offline</Badge>}
                  </div>
                  {isEditingSimplified ? <Textarea className="min-h-[200px] font-bold text-lg rounded-2xl" value={simplifiedMessage} onChange={(e) => setSimplifiedMessage(e.target.value)} /> : <p className="text-lg font-bold italic leading-relaxed">"{simplifiedMessage}"</p>}
                  
                  <IntegrityReport result={simplifiedIntegrity} />
                  
                  <Button variant="outline" size="sm" className="rounded-full h-8 text-[9px] uppercase font-black" onClick={() => setIsEditingSimplified(!isEditingSimplified)}>{isEditingSimplified ? "Save & Check" : "Manual Edit"}</Button>
                </Card>
              </div>
              
              <div className="space-y-8 pt-8 border-t border-primary/5">
                <div className="text-center space-y-2">
                   <h3 className="text-xl font-black uppercase tracking-tight">2. Translate for Parents</h3>
                   <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select languages</p>
                </div>
                
                {!isOnline && (
                   <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700">
                      <AlertCircle className="size-5 shrink-0" />
                      <p className="text-[10px] font-bold uppercase leading-tight">Translations and checks require a connection.</p>
                   </div>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {TARGET_LANGUAGES.map(lang => (
                    <div 
                      key={lang} 
                      className={cn(
                        "flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-all", 
                        selectedTargetLanguages.includes(lang) ? "bg-primary/5 border-primary" : "bg-white/40 border-transparent",
                        !isOnline && "opacity-50 cursor-not-allowed"
                      )} 
                      onClick={() => isOnline && setSelectedTargetLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                    >
                      <Checkbox checked={selectedTargetLanguages.includes(lang)} disabled={!isOnline} />
                      <Label className="text-[10px] font-black uppercase cursor-pointer">{lang}</Label>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full h-16 rounded-2xl font-black bg-primary uppercase text-sm shadow-lg shadow-primary/20" 
                  disabled={selectedTargetLanguages.length === 0 || isTranslating || !isOnline} 
                  onClick={handleTranslateWithAI}
                >
                  {isTranslating ? <Loader2 className="animate-spin mr-2" /> : "Translate & Check Integrity"}
                </Button>

                {Object.entries(translations).map(([lang, text]) => (
                  <Card key={lang} className="p-6 space-y-6 rounded-[2rem] border-primary/10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                       <Badge variant="outline" className="text-[8px] font-black uppercase">{lang}</Badge>
                    </div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Translation Review</p>
                    
                    {editingTranslationLang === lang ? (
                      <Textarea className="min-h-[140px] font-bold rounded-2xl" value={text} onChange={(e) => setTranslations({...translations, [lang]: e.target.value})} />
                    ) : (
                      <p className="text-base font-bold italic leading-relaxed">"{text}"</p>
                    )}
                    
                    <IntegrityReport result={translationIntegrity[lang]} />
                    
                    {audioUris[lang] && <AudioPlayer audioUri={audioUris[lang]} lang={lang} />}
                    
                    <div className="flex gap-2 border-t border-primary/5 pt-4">
                      <Button variant="ghost" size="sm" className="h-8 rounded-full text-[9px] uppercase font-black" onClick={() => setEditingTranslationLang(editingTranslationLang === lang ? null : lang)}>
                        {editingTranslationLang === lang ? "Finish Edit" : "Edit Translation"}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1">
                              <Button variant="ghost" size="sm" className="w-full h-8 rounded-full text-[9px] uppercase font-black" onClick={() => handleGenerateAudio(lang, text)} disabled={generatingAudioLang === lang || !isOnline}>
                                {generatingAudioLang === lang ? <Loader2 className="size-3 animate-spin" /> : "Generate Voice"}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {!isOnline && <TooltipContent>Internet required for Voice generation</TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </Card>
                ))}
                <Button className="w-full h-16 rounded-2xl font-black bg-primary uppercase shadow-xl" onClick={() => setCurrentView("final-review")}>Continue to Final Review</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in space-y-8 pb-12">
          <header className="text-center space-y-2">
             <h2 className="text-3xl font-black tracking-tight text-primary uppercase">FINAL APPROVAL</h2>
          </header>

          <Button variant="ghost" onClick={() => setCurrentView("create-message")} className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
             <ArrowLeft className="size-3" /> Edit Message
          </Button>

          <Card className="p-8 space-y-8 rounded-[2.5rem] border-primary/20 border-2 bg-white shadow-2xl">
            <CardTitle className="text-2xl font-black text-primary leading-tight">{form.title}</CardTitle>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Official Message Record</Label>
                <p className="text-sm font-medium opacity-60 bg-muted/30 p-5 rounded-3xl leading-relaxed italic">{form.message}</p>
              </div>
              
              <div className="space-y-4">
                <Label className="text-[9px] font-black uppercase text-primary ml-1">AI Simplified Version</Label>
                <div className="space-y-3">
                   <p className="text-base font-bold italic bg-primary/5 p-6 rounded-3xl leading-relaxed">"{simplifiedMessage || form.message}"</p>
                   <IntegrityReport result={simplifiedIntegrity} />
                </div>
              </div>
            </div>
            
            <Separator className="bg-primary/5" />

            <div className="space-y-6">
              <Label className="text-[9px] font-black uppercase text-indigo-600 ml-1">Approved Translations</Label>
              {Object.entries(translations).length === 0 ? (
                <div className="p-6 bg-muted/20 rounded-3xl text-center">
                   <p className="text-[10px] font-black uppercase text-muted-foreground/60">No translations generated.</p>
                </div>
              ) : Object.entries(translations).map(([lang, text]) => (
                <div key={lang} className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 space-y-4">
                  <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black uppercase text-indigo-600">{lang}</p>
                     <Badge variant="outline" className="text-[7px] h-3 px-1 uppercase font-black border-indigo-200 text-indigo-400">Verified Language</Badge>
                  </div>
                  <p className="text-sm font-bold italic leading-relaxed">"{text}"</p>
                  
                  <IntegrityReport result={translationIntegrity[lang]} />
                  
                  {audioUris[lang] && <AudioPlayer audioUri={audioUris[lang]} lang={lang} />}
                </div>
              ))}
            </div>

            <div className="space-y-4 p-8 bg-indigo-50/30 rounded-[2rem] border-2 border-indigo-200">
              <h4 className="text-[10px] font-black uppercase text-indigo-900 tracking-widest mb-2 flex items-center gap-2">
                 <ShieldCheck className="size-3" /> Security & Review Checklist
              </h4>
              {['original', 'simplified', 'translations', 'dates', 'names', 'audio'].map(id => (
                <div key={id} className="flex items-center space-x-3">
                  <Checkbox 
                    id={`check-${id}`} 
                    checked={checklist[id as keyof typeof checklist]} 
                    onCheckedChange={(v) => setChecklist({...checklist, [id]: v === true})} 
                  />
                  <Label htmlFor={`check-${id}`} className="text-[11px] font-bold text-indigo-900 uppercase cursor-pointer">
                    Verified {id.replace(/_/g, ' ')}
                  </Label>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="w-full h-16 rounded-2xl font-black uppercase text-xs" 
                onClick={handleSaveDraft}
              >
                <Save className="size-4 mr-2" /> Update Draft
              </Button>
              <Button 
                className="w-full h-20 rounded-3xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200" 
                disabled={isSavingNotice || !isOnline} 
                onClick={handleApproveNotice}
              >
                {isSavingNotice ? <Loader2 className="animate-spin mr-2" /> : "Approve Official Notice"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
