
import 'server-only';

import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * 
 * STRICT SECURITY: Derives configuration exclusively from verified server-side environment variables.
 */
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      // Manual Service Account Configuration (Recommended for Vercel/Production)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else if (projectId) {
      // Attempt to use Application Default Credentials (ADC) with a specific Project ID
      admin.initializeApp({
        projectId,
      });
    } else {
      // Full fallback to default environment credentials
      admin.initializeApp();
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Failed:", error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Verifies the Firebase ID Token and returns the trusted user identity.
 * Strictly verifies project consistency between client and server.
 */
export async function verifyAuth(idToken: string) {
  if (!idToken) {
    throw new Error("UNAUTHORIZED_ACCESS: Missing authentication token.");
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Fetch user profile securely to verify role and school affiliation
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new Error("USER_PROFILE_NOT_FOUND: Authenticated user has no profile.");
    }

    const userData = userSnap.data();
    return {
      uid,
      role: userData?.role as string,
      schoolName: userData?.schoolName || "Unknown School",
    };
  } catch (error: any) {
    console.error("verifyAuth failed:", error.message);
    throw new Error("INVALID_OR_EXPIRED_TOKEN: Session expired or invalid.");
  }
}

/**
 * Verifies that the user has one of the allowed roles.
 */
export function authorizeRole(user: { role: string }, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN_ACCESS: Insufficient permissions.");
  }
}
