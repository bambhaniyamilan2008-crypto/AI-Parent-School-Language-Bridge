
import 'server-only';

import * as admin from 'firebase-admin';
import { serverLog } from './logger';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Default limits for AI operations.
 */
const LIMITS = {
  MINUTE: 5,
  DAILY: 50,
};

export type AiOperation = 'SIMPLIFY' | 'TRANSLATE' | 'TTS' | 'STT' | 'INTEGRITY' | 'MEDIATE';

/**
 * SECURE SERVER-SIDE USAGE MANAGEMENT:
 * This function handles usage tracking exclusively via the Admin SDK.
 * It enforces quotas atomically and logs rejections for monitoring.
 */
export async function checkAndIncrementUsage(userId: string, operation: AiOperation) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const minuteStr = now.toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm
  
  const usageId = `${userId}_${operation}_${dateStr}`;
  const usageRef = db.collection('ai_usage_logs').doc(usageId);
  const userRef = db.collection('users').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Fetch user profile securely
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error("UNAUTHORIZED_ACCESS");
      }
      const schoolName = userSnap.data()?.schoolName || "Unknown School";

      // 2. Get current usage state
      const snapshot = await transaction.get(usageRef);
      const data = snapshot.exists ? snapshot.data() : { 
        count: 0, 
        minuteCount: 0, 
        lastMinute: minuteStr,
        userId,
        schoolName,
        operation,
        date: dateStr
      };

      // 3. Reset minute count if needed
      const isNewMinute = data?.lastMinute !== minuteStr;
      const newMinuteCount = isNewMinute ? 1 : (data?.minuteCount || 0) + 1;
      const newDailyCount = (data?.count || 0) + 1;

      // 4. Enforcement
      if (newMinuteCount > LIMITS.MINUTE) {
        serverLog('warn', {
          operation: 'RATE_LIMIT',
          status: 'rate_limit',
          userId,
          schoolName,
          errorCategory: 'MINUTE_LIMIT_REACHED'
        });
        throw new Error("RATE_LIMIT_MINUTE");
      }
      if (newDailyCount > LIMITS.DAILY) {
        serverLog('warn', {
          operation: 'RATE_LIMIT',
          status: 'rate_limit',
          userId,
          schoolName,
          errorCategory: 'DAILY_LIMIT_REACHED'
        });
        throw new Error("RATE_LIMIT_DAILY");
      }

      // 5. Update counters atomically
      transaction.set(usageRef, {
        userId,
        schoolName,
        operation,
        count: newDailyCount,
        minuteCount: newMinuteCount,
        lastMinute: minuteStr,
        date: dateStr,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
  } catch (error: any) {
    if (error.message === "RATE_LIMIT_MINUTE") {
      throw new Error("AI request limit reached for this minute. Please wait and try again.");
    }
    if (error.message === "RATE_LIMIT_DAILY") {
      throw new Error("Daily AI usage limit reached. Please contact your school administrator or try again tomorrow.");
    }
    if (error.message === "UNAUTHORIZED_ACCESS") {
      throw new Error("Unauthorized: User profile not found.");
    }
    throw error;
  }
}
