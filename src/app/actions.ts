
"use server";

import { aiMediation } from "@/ai/flows/ai-message-rephrasing";
import { translateText } from "@/ai/flows/translate-text";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { simplifySchoolMessage } from "@/ai/flows/simplify-message";
import { voiceMessageTranscription } from "@/ai/flows/voice-message-transcription";
import { checkContentIntegrity } from "@/ai/flows/content-integrity-check";
import { checkAndIncrementUsage } from "@/lib/rate-limit";
import { verifyAuth, authorizeRole } from "@/lib/auth-server";
import { serverLog } from "@/lib/logger";

/**
 * SECURE SERVER ACTIONS:
 * Every action verifies user identity via validated ID tokens.
 * Integrated monitoring and logging with request correlation for staging/production visibility.
 */

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function transcribeAudioAction(idToken: string, audioDataUri: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    await checkAndIncrementUsage(user.uid, 'STT');
    
    const result = await voiceMessageTranscription({ audioDataUri });
    
    serverLog('info', {
      operation: 'STT',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      schoolName: user.schoolName,
      requestId
    });

    return result.transcribedText;
  } catch (error: any) {
    serverLog('error', {
      operation: 'STT',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      errorCategory: error.message.includes('RATE_LIMIT') ? 'RATE_LIMIT' : 'SYSTEM_ERROR',
      errorCode: error.code || 'UNKNOWN',
      requestId
    });
    throw new Error(error.message || "Failed to transcribe audio.");
  }
}

export async function mediateMessage(idToken: string, audioDataUri?: string, textMessage?: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    // Mediation is exclusively for Parents and Students
    authorizeRole(user, ['Parent', 'Child']); 
    
    await checkAndIncrementUsage(user.uid, 'MEDIATE');
    
    const mediationResult = await aiMediation({
      audioDataUri,
      textMessage,
    });

    serverLog('info', {
      operation: 'MEDIATE',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      schoolName: user.schoolName,
      requestId
    });

    return {
      transcription: mediationResult.originalMessage,
      sentiment: mediationResult.originalSentiment,
      rephrased: mediationResult.rephrasedMessage,
      explanation: mediationResult.explanation,
      safety: mediationResult.safety,
    };
  } catch (error: any) {
    serverLog('error', {
      operation: 'MEDIATE',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      errorCategory: error.message.includes('FORBIDDEN') ? 'AUTHORIZATION' : 'SYSTEM_ERROR',
      requestId
    });
    throw new Error(error.message || "Mediation failed.");
  }
}

export async function getTranslatedSpeech(idToken: string, text: string, language: string) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    let user;
    try {
        user = await verifyAuth(idToken);
        await checkAndIncrementUsage(user.uid, 'TTS');
        
        let textToSpeak = text;
        if (language.toLowerCase() !== 'english') {
            const translationResult = await translateText({ text: text, targetLanguage: language });
            textToSpeak = translationResult.translatedText;
        }

        const speechResult = await textToSpeech({ text: textToSpeak, language: language });
        
        serverLog('info', {
          operation: 'TTS',
          status: 'success',
          durationMs: Date.now() - startTime,
          userId: user.uid,
          requestId
        });

        return { audioDataUri: speechResult.audioDataUri };

    } catch (error: any) {
        serverLog('error', {
          operation: 'TTS',
          status: 'failure',
          durationMs: Date.now() - startTime,
          userId: user?.uid,
          errorCategory: 'SYSTEM_ERROR',
          requestId
        });
        throw new Error(error.message || "Failed to generate speech.");
    }
}

export async function generateAudioAction(idToken: string, text: string, language: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    if (!text.trim()) throw new Error("Text cannot be empty.");
    
    await checkAndIncrementUsage(user.uid, 'TTS');
    const result = await textToSpeech({ text, language });
    
    serverLog('info', {
      operation: 'GENERATE_AUDIO',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      requestId
    });

    return { audioDataUri: result.audioDataUri };
  } catch (error: any) {
    serverLog('error', {
      operation: 'GENERATE_AUDIO',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      requestId
    });
    throw new Error(error.message || "Failed to generate audio.");
  }
}

export async function simplifyMessageAction(idToken: string, originalMessage: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    authorizeRole(user, ['Teacher', 'SchoolAdmin']);
    
    await checkAndIncrementUsage(user.uid, 'SIMPLIFY');
    const result = await simplifySchoolMessage({ originalMessage });
    
    serverLog('info', {
      operation: 'SIMPLIFY',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      schoolName: user.schoolName,
      requestId
    });

    return result;
  } catch (error: any) {
    serverLog('error', {
      operation: 'SIMPLIFY',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      requestId
    });
    throw new Error(error.message || "Failed to simplify message.");
  }
}

export async function translateMultipleLanguagesAction(idToken: string, text: string, languages: string[]) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    authorizeRole(user, ['Teacher', 'SchoolAdmin']);
    
    await checkAndIncrementUsage(user.uid, 'TRANSLATE');
    const results = await Promise.all(
      languages.map(async (lang) => {
        const result = await translateText({ text, targetLanguage: lang });
        return { lang, text: result.translatedText };
      })
    );

    serverLog('info', {
      operation: 'TRANSLATE_MULTI',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      requestId
    });

    return results;
  } catch (error: any) {
    serverLog('error', {
      operation: 'TRANSLATE_MULTI',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      requestId
    });
    throw new Error(error.message || "Failed to translate messages.");
  }
}

export async function translateSingleLanguageAction(idToken: string, text: string, language: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    await checkAndIncrementUsage(user.uid, 'TRANSLATE');
    
    const result = await translateText({ text, targetLanguage: language });

    serverLog('info', {
      operation: 'TRANSLATE_SINGLE',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      requestId
    });

    return result.translatedText;
  } catch (error: any) {
    serverLog('error', {
      operation: 'TRANSLATE_SINGLE',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      requestId
    });
    throw new Error(error.message || `Failed to translate message to ${language}.`);
  }
}

export async function checkContentIntegrityAction(idToken: string, original: string, target: string, context: 'simplification' | 'translation', targetLanguage?: string) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  let user;
  try {
    user = await verifyAuth(idToken);
    authorizeRole(user, ['Teacher', 'SchoolAdmin']);
    
    await checkAndIncrementUsage(user.uid, 'INTEGRITY');
    const result = await checkContentIntegrity({
      originalMessage: original,
      targetMessage: target,
      context,
      targetLanguage
    });

    serverLog('info', {
      operation: 'INTEGRITY_CHECK',
      status: 'success',
      durationMs: Date.now() - startTime,
      userId: user.uid,
      requestId
    });

    return result;
  } catch (error: any) {
    serverLog('warn', {
      operation: 'INTEGRITY_CHECK',
      status: 'failure',
      durationMs: Date.now() - startTime,
      userId: user?.uid,
      errorCategory: 'SERVICE_UNAVAILABLE',
      requestId
    });
    return { status: 'unavailable', issues: [] } as any;
  }
}
