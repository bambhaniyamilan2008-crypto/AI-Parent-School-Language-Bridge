
"use client";

import { useAuth, useFirestore, useUser } from "@/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import type { Conversation, Role, UserProfile, RecipientProfile, AppNotification, TextSize } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react";

function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  } else if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
}

type AppState = {
  userProfile: UserProfile | null;
  history: Conversation[];
  notifications: AppNotification[];
  currentConversation: Partial<Conversation> | null;
  selectedTeacher: RecipientProfile | null;
  isOnline: boolean;
  isOnboardingComplete: boolean;
  isInitialLoading: boolean;
};

type Action =
  | { type: "SET_USER_PROFILE"; payload: UserProfile | null }
  | { type: "SET_HISTORY"; payload: Conversation[] }
  | { type: "SET_NOTIFICATIONS"; payload: AppNotification[] }
  | { type: "START_CONVERSATION" }
  | { type: "UPDATE_CONVERSATION"; payload: Partial<Conversation> }
  | { type: "FINISH_CONVERSATION" }
  | { type: "SET_RECIPIENT"; payload: RecipientProfile | null }
  | { type: "SET_ONLINE_STATUS"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: AppState = {
  userProfile: null,
  history: [],
  notifications: [],
  currentConversation: null,
  selectedTeacher: null,
  isOnline: true, // Default to true for server/initial client render to avoid hydration mismatch
  isOnboardingComplete: false,
  isInitialLoading: true,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case "SET_USER_PROFILE":
      return { 
        ...state, 
        userProfile: action.payload, 
        isOnboardingComplete: !!action.payload,
        isInitialLoading: false 
      };
    case "SET_HISTORY":
      return { ...state, history: action.payload };
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload };
    case "START_CONVERSATION":
      return {
        ...state,
        currentConversation: { id: `conv-${Date.now()}` },
      };
    case "UPDATE_CONVERSATION":
      return {
        ...state,
        currentConversation: { ...state.currentConversation, ...action.payload },
      };
    case "FINISH_CONVERSATION":
      return {
        ...state,
        currentConversation: null,
      };
    case "SET_RECIPIENT":
      return { ...state, selectedTeacher: action.payload };
    case "SET_ONLINE_STATUS":
      return { ...state, isOnline: action.payload };
    case "SET_LOADING":
      return { ...state, isInitialLoading: action.payload };
    default:
      return state;
  }
};

interface AppContextType extends AppState {
  completeOnboarding: (profile: UserProfile, password?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  startConversation: () => void;
  updateConversation: (data: Partial<Conversation>) => void;
  finishConversation: () => Promise<void>;
  setSelectedTeacher: (recipient: RecipientProfile | null) => void;
  sendReply: (receiverId: string, receiverName: string, text: string, noticeId?: string, noticeTitle?: string, translatedText?: string, translatedLanguage?: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateAccessibilityPrefs: (prefs: { textSize?: TextSize, easyReadingMode?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      dispatch({ type: "SET_USER_PROFILE", payload: null });
      return;
    }

    let isSubscribed = true;

    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!isSubscribed) return;

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          dispatch({ type: "SET_USER_PROFILE", payload: { ...data, id: user.uid } });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        if (!isSubscribed) return;
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'get'
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    };

    fetchProfile();
    
    return () => {
      isSubscribed = false;
    };
  }, [user, isUserLoading, db]);

  // Notifications Listener - restricted to Parent role and profile availability
  useEffect(() => {
    if (!user || state.userProfile?.role !== 'Parent' || !state.userProfile?.id) {
      dispatch({ type: "SET_NOTIFICATIONS", payload: [] });
      return;
    }

    const q = query(
      collection(db, "notifications"), 
      where("parentUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      } as AppNotification));
      
      const sorted = notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      dispatch({ type: "SET_NOTIFICATIONS", payload: sorted });
    }, (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'notifications',
            operation: 'list'
        }));
    });

    return () => unsubscribe();
  }, [user, db, state.userProfile?.role, state.userProfile?.id]);

  // History Listener - defensive to wait for profile if role check is needed
  useEffect(() => {
    if (!user || !state.userProfile) {
      dispatch({ type: "SET_HISTORY", payload: [] });
      return;
    }

    const qSent = query(collection(db, "conversations"), where("senderId", "==", user.uid));
    const qReceived = query(collection(db, "conversations"), where("receiverId", "==", user.uid));

    let sentMessages: Conversation[] = [];
    let receivedMessages: Conversation[] = [];

    const updateHistory = () => {
      const combined = [...sentMessages, ...receivedMessages];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      const sorted = unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      dispatch({ type: "SET_HISTORY", payload: sorted });
    };

    const unsubSent = onSnapshot(qSent, { includeMetadataChanges: true }, (snapshot) => {
      sentMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Conversation));
      updateHistory();
    }, (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'conversations',
            operation: 'list'
        }));
    });

    const unsubReceived = onSnapshot(qReceived, { includeMetadataChanges: true }, (snapshot) => {
      receivedMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Conversation));
      updateHistory();
    }, (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'conversations',
            operation: 'list'
        }));
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user, db, state.userProfile]);

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if(typeof navigator !== 'undefined') {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: navigator.onLine });
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const completeOnboarding = useCallback(async (profile: UserProfile, password?: string) => {
    if (!profile.email || !password) {
      throw new Error("Email and password are required for registration.");
    }

    let currentUser = user;
    
    try {
      if (currentUser?.isAnonymous) {
        const credential = EmailAuthProvider.credential(profile.email, password);
        const result = await linkWithCredential(currentUser, credential);
        currentUser = result.user;
      } else if (!currentUser) {
        const result = await createUserWithEmailAndPassword(auth, profile.email, password);
        currentUser = result.user;
      } else if (currentUser.email !== profile.email) {
        throw new Error("You are currently logged in as a different user. Please logout and try again.");
      }
      
      if (!currentUser?.uid) {
        throw new Error("Registration failed: Could not verify your identity with the server.");
      }

      const uid = currentUser.uid;
      const cleanProfile = sanitizeData(profile);
      const userDocRef = doc(db, "users", uid);
      const userData = sanitizeData({ 
        ...cleanProfile, 
        id: uid, 
        email: profile.email,
        createdAt: new Date().toISOString() 
      });

      await setDoc(userDocRef, userData);

      const collectionName = profile.role === "Child" ? "students" : profile.role === "Parent" ? "parents" : "teachers";
      const roleDocRef = doc(db, collectionName, uid);
      
      let roleData: any = { 
        userId: uid, 
        name: profile.name, 
        email: profile.email,
        schoolName: profile.schoolName,
        updatedAt: new Date().toISOString() 
      };
      if (profile.role === "Child") roleData.gradeClass = profile.gradeClass;
      if (profile.role === "Parent") roleData.childName = profile.childName;

      await setDoc(roleDocRef, sanitizeData(roleData));

      dispatch({ type: "SET_USER_PROFILE", payload: { ...cleanProfile, id: uid } });
      
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error("This email is already registered. Please log in instead.");
      }
      throw new Error(authError.message || "Failed to complete account setup.");
    }
  }, [user, auth, db]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        throw new Error("Invalid email or password.");
      }
      throw new Error(error.message || "Login failed.");
    }
  }, [auth]);

  const startConversation = useCallback(() => {
    dispatch({ type: "START_CONVERSATION" });
  }, []);

  const updateConversation = useCallback((data: Partial<Conversation>) => {
    dispatch({ type: "UPDATE_CONVERSATION", payload: data });
  }, []);

  const finishConversation = useCallback(async () => {
    if (!state.currentConversation || !user || !state.selectedTeacher) return;
    
    const convId = state.currentConversation.id || `conv-${Date.now()}`;
    const rawConversation = {
      ...state.currentConversation,
      id: convId,
      senderId: user.uid,
      senderName: state.userProfile?.name || "User",
      senderLanguage: state.userProfile?.language || "English",
      receiverId: state.selectedTeacher.id,
      receiverName: state.selectedTeacher.name,
      timestamp: Date.now(),
      role: state.userProfile?.role || "Child",
      offlineStored: !state.isOnline,
      read: false,
      schoolName: state.userProfile?.schoolName
    };

    const convDocRef = doc(db, "conversations", convId);
    setDoc(convDocRef, sanitizeData(rawConversation)).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `conversations/${convId}`,
            operation: 'create',
            requestResourceData: rawConversation
        }));
    });

    dispatch({ type: "FINISH_CONVERSATION" });
  }, [state.currentConversation, state.selectedTeacher, state.userProfile, user, db, state.isOnline]);

  const setSelectedTeacher = useCallback((recipient: RecipientProfile | null) => {
    dispatch({ type: "SET_RECIPIENT", payload: recipient });
  }, []);

  const sendReply = useCallback(async (receiverId: string, receiverName: string, text: string, noticeId?: string, noticeTitle?: string, translatedText?: string, translatedLanguage?: string) => {
    if (!user || !state.userProfile) return;
    const id = `reply-${Date.now()}`;
    const reply = sanitizeData({
      id,
      timestamp: Date.now(),
      senderId: user.uid,
      senderName: state.userProfile.name,
      receiverId,
      receiverName,
      role: state.userProfile.role,
      transcription: text,
      rephrased: text,
      translatedText,
      translatedLanguage,
      noticeId,
      noticeTitle,
      offlineStored: !state.isOnline,
      schoolName: state.userProfile.schoolName
    });

    const replyDocRef = doc(db, "conversations", id);
    setDoc(replyDocRef, reply).catch(e => {});
  }, [user, state.userProfile, db, state.isOnline]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const ref = doc(db, "notifications", notificationId);
      await updateDoc(ref, { isRead: true, readAt: new Date().toISOString() });
    } catch (e) {}
  }, [db]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "notifications"), where("parentUid", "==", user.uid), where("isRead", "==", false));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.update(d.ref, { isRead: true, readAt: new Date().toISOString() }));
      await batch.commit();
    } catch (e) {}
  }, [db, user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (e) {}
  }, [db]);

  const updateAccessibilityPrefs = useCallback(async (prefs: { textSize?: TextSize, easyReadingMode?: boolean }) => {
    if (!user || !state.userProfile) return;
    
    const newProfile = { ...state.userProfile, ...prefs };
    dispatch({ type: "SET_USER_PROFILE", payload: newProfile });

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, prefs);
    } catch (e) {}
  }, [user, state.userProfile, db]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      try {
        const { clearIndexedDbPersistence } = await import("firebase/firestore");
        await clearIndexedDbPersistence(db);
      } catch (cacheErr) {}

      dispatch({ type: "SET_USER_PROFILE", payload: null });
      router.push("/");
    } catch (error) {}
  }, [auth, db, router]);

  const value = useMemo(
    () => ({
      ...state,
      completeOnboarding,
      login,
      startConversation,
      updateConversation,
      finishConversation,
      setSelectedTeacher,
      sendReply,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      updateAccessibilityPrefs,
      logout,
    }),
    [state, completeOnboarding, login, startConversation, updateConversation, finishConversation, setSelectedTeacher, sendReply, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, updateAccessibilityPrefs, logout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
