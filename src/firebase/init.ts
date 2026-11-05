'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';

/**
 * Mapping of internal config keys to their public environment variable names.
 */
const ENV_VAR_MAP: Record<string, string> = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID'
};

/**
 * Validates the Firebase configuration.
 */
function validateConfig(config: typeof firebaseConfig): { isValid: boolean; missing: string[] } {
  const requiredKeys = ['apiKey', 'projectId', 'appId'] as const;
  const missingKeys = requiredKeys.filter(key => !config[key]);

  if (missingKeys.length > 0) {
    return {
      isValid: false,
      missing: missingKeys.map(k => ENV_VAR_MAP[k])
    };
  }
  return { isValid: true, missing: [] };
}

export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(getApp());
  }

  const { isValid, missing } = validateConfig(firebaseConfig);

  // If configuration is invalid, do not attempt to initialize real SDKs.
  // This prevents the 'auth/network-request-failed' noise from dummy keys.
  if (!isValid) {
    const errorMsg = `Firebase Configuration Error: Missing [${missing.join(', ')}].`;
    if (process.env.NODE_ENV === 'production') {
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.warn(`${errorMsg} App will display setup required screen.`);
      return { firebaseApp: null, auth: null, firestore: null };
    }
  }

  let firebaseApp: FirebaseApp;

  try {
    // Try automatic initialization first
    firebaseApp = initializeApp();
  } catch (e) {
    // Fallback to manual initialization with validated config
    firebaseApp = initializeApp(firebaseConfig);
  }

  // DEVELOPMENT ONLY: Log the project ID to help identify project mismatches
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Firebase] Initialized for project: ${firebaseApp.options.projectId}`);
  }

  if (typeof window !== 'undefined') {
    try {
      initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
    } catch (err) {
      // Handle re-initialization silently
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp | null) {
  if (!firebaseApp) {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  let auth: Auth;
  let firestore: Firestore;

  try {
    auth = getAuth(firebaseApp);
  } catch (e) {
    auth = null as any;
  }

  try {
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    firestore = null as any;
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}
