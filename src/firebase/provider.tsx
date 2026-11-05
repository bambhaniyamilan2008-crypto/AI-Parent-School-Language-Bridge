'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Renders a fallback UI when Firebase configuration is missing.
 */
function SetupRequiredUI() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <Card className="max-w-md w-full border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="pt-10 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
            <Settings className="size-8 text-primary animate-spin-slow" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            Setup Required
          </CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500 mt-2">
            Your Firebase project is not yet fully connected to this application environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10 space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
              <AlertCircle className="size-4" />
              Missing Configuration
            </div>
            <p className="text-xs text-amber-800/80 leading-relaxed">
              Please ensure your <strong>.env</strong> file contains valid keys for:
              <code className="block mt-2 bg-white/50 p-2 rounded-lg font-mono text-[10px] text-amber-900">
                NEXT_PUBLIC_FIREBASE_API_KEY<br/>
                NEXT_PUBLIC_FIREBASE_PROJECT_ID<br/>
                NEXT_PUBLIC_FIREBASE_APP_ID
              </code>
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Instructions
            </p>
            <ol className="text-xs text-slate-600 space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-[10px]">1</span>
                <span>Open the <strong>Firebase</strong> sidebar in the Studio.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-[10px]">2</span>
                <span>Click <strong>"Connect Project"</strong> or re-provision your resources.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center font-black text-[10px]">3</span>
                <span>Once variables appear in your environment, refresh this page.</span>
              </li>
            </ol>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4 mr-2" />
            Refresh Page
          </Button>
        </CardContent>
      </Card>
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp,
      firestore,
      auth,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  // If services are completely missing in development, show the setup UI
  if (!contextValue.areServicesAvailable && process.env.NODE_ENV === 'development') {
    return <SetupRequiredUI />;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/**
 * Hook to memoize Firebase references and queries.
 * This is critical to prevent infinite re-render loops when using useCollection or useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { 
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
