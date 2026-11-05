
export type Role = "Child" | "Parent" | "Teacher" | "SchoolAdmin";

export type Sentiment = "Negative" | "Neutral" | "Positive";

export type TextSize = 'small' | 'medium' | 'large';

export type EducationLevel = 
  | "1-5" 
  | "6-8" 
  | "9-12" 
  | "Primary School" 
  | "Secondary School" 
  | "Graduate" 
  | "Post Graduate";

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  language: string;
  educationLevel?: EducationLevel;
  email?: string;
  schoolName?: string;
  gradeClass?: string;
  subject?: string;
  teacherIds?: string[];
  authorizedTeacherIds?: string[];
  childName?: string;
  childClass?: string;
  // Accessibility Prefs
  textSize?: TextSize;
  easyReadingMode?: boolean;
}

export interface TeacherProfile {
  id: string;
  name: string;
  subject: string;
  schoolName: string;
  availableTime: string;
  availableTimeSlot?: string; 
  contactEmail?: string;
  contactPhone?: string;
  language?: string; 
}

export interface RecipientProfile {
  id: string;
  name: string;
  role: Role;
  subtext?: string;
  secondaryText?: string;
  language?: string; 
}

export interface MessageSafetyAssessment {
  isSafe: boolean;
  flaggedKeywords: string[];
  aiAssessment: string;
  isAiBlocked: boolean;
}

export interface MessageSafetyCheckOutput {
  originalMessageSafety: MessageSafetyAssessment;
  reframedMessageSafety: MessageSafetyAssessment;
}

export interface Conversation {
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  senderClass?: string;
  senderLanguage?: string;
  receiverId: string;
  receiverName: string;
  receiverLanguage?: string;
  role: Role;
  audioDataUri?: string;
  textMessage?: string;
  transcription: string;
  rephrased: string;
  translatedText?: string;
  translatedLanguage?: string;
  sentiment: Sentiment;
  explanation: string;
  safety: MessageSafetyCheckOutput;
  offlineStored?: boolean;
  noticeId?: string;
  noticeTitle?: string;
  read?: boolean;
  schoolName?: string;
}

export type NoticeStatus = "draft" | "pending_review" | "approved";

export interface IntegrityIssue {
  category: 'date' | 'time' | 'number' | 'name' | 'instruction' | 'other';
  originalValue: string;
  targetValue: string;
  explanation: string;
}

export interface IntegrityCheckResult {
  status: 'clean' | 'warning' | 'unavailable';
  issues: IntegrityIssue[];
}

export interface SchoolNotice {
  id: string;
  teacherId: string;
  teacherName: string;
  schoolName: string;
  title: string;
  type: string;
  targetClass: string;
  recipients: string;
  date?: string;
  time?: string;
  originalMessage: string;
  simplifiedMessage: string;
  translations: Record<string, string>;
  audioUris: Record<string, string>;
  status: NoticeStatus;
  createdAt: string;
  approvedAt?: string;
  updatedAt?: string;
  requireAcknowledgement?: boolean;
  integrityResults?: {
    simplified?: IntegrityCheckResult;
    translations?: Record<string, IntegrityCheckResult>;
  };
}

export type AcknowledgementStatus = 'understood' | 'clarify';

export interface NoticeAcknowledgement {
  id: string;
  noticeId: string;
  parentUid: string;
  parentName: string;
  status: AcknowledgementStatus;
  timestamp: string;
  offlineStored?: boolean;
}

export interface AppNotification {
  id: string;
  parentUid: string;
  noticeId: string;
  title: string;
  type: string;
  messagePreview: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  teacherName?: string;
  schoolName?: string;
}

export interface NoticeEngagement {
  noticeId: string;
  targetedCount: number;
  viewedCount: number;
  pendingCount: number;
}

export type AuditAction = 
  | 'created' 
  | 'updated' 
  | 'submitted' 
  | 'approved' 
  | 'ack_requirement_changed';

export interface NoticeAuditLog {
  id: string;
  noticeId: string;
  noticeTitle: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  schoolName: string;
  metadata?: {
    fieldsChanged?: string[];
    [key: string]: any;
  };
}
