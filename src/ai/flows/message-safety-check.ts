'use server';
/**
 * @fileOverview A Genkit flow for performing safety checks on messages.
 *
 * - messageSafetyCheck - A function that handles the safety check process for original and reframed messages.
 * - MessageSafetyCheckInput - The input type for the messageSafetyCheck function.
 * - MessageSafetyCheckOutput - The return type for the messageSafetyCheck function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Keyword Scanner Tool Definition ---

// A predefined list of inappropriate keywords for an educational environment.
const inappropriateKeywords = ['stupid', 'idiot', 'hate', 'kill', 'violence', 'badword', 'swear', 'cuss', 'ass', 'bitch', 'fuck', 'shit', 'damn', 'hell', 'crap', 'porn', 'sex', 'nude', 'bomb', 'terrorist', 'weapon', 'threat', 'attack', 'harm', 'abuse', 'bully', 'racist', 'sexist', 'homophobic'];

const KeywordScannerInputSchema = z.object({
  message: z.string().describe('The message to scan for inappropriate keywords.'),
});

const KeywordScannerOutputSchema = z.object({
  isSafe: z.boolean().describe('True if no inappropriate keywords were found, false otherwise.'),
  flaggedKeywords: z.array(z.string()).describe('A list of inappropriate keywords found in the message.'),
});

const keywordScannerTool = ai.defineTool(
  {
    name: 'keywordScanner',
    description: 'Scans a given message for predefined inappropriate keywords suitable for an educational environment.',
    inputSchema: KeywordScannerInputSchema,
    outputSchema: KeywordScannerOutputSchema,
  },
  async (input) => {
    const messageLower = input.message.toLowerCase();
    const foundKeywords: string[] = [];
    let isSafe = true;

    for (const keyword of inappropriateKeywords) {
      if (messageLower.includes(keyword)) {
        foundKeywords.push(keyword);
        isSafe = false;
      }
    }

    return {
      isSafe,
      flaggedKeywords: foundKeywords,
    };
  }
);

// --- Main Flow Schemas ---

const MessageSafetyCheckInputSchema = z.object({
  originalMessage: z.string().describe('The original message provided by the user.'),
  reframedMessage: z.string().describe('The AI-reframed version of the message.'),
});
export type MessageSafetyCheckInput = z.infer<typeof MessageSafetyCheckInputSchema>;

const MessageSafetyCheckOutputSchema = z.object({
  originalMessageSafety: z.object({
    isSafe: z.boolean().describe('Overall safety status of the original message (true if both keyword scan and AI assessment pass).'),
    flaggedKeywords: z.array(z.string()).describe('Keywords flagged by the scanner in the original message.'),
    aiAssessment: z.string().describe('AI model’s assessment of the original message, or "BLOCKED" if safety filters were triggered.'),
    isAiBlocked: z.boolean().describe('True if the AI model blocked the original message due to safety filters.'),
  }).describe('Safety details for the original message.'),
  reframedMessageSafety: z.object({
    isSafe: z.boolean().describe('Overall safety status of the reframed message (true if both keyword scan and AI assessment pass).'),
    flaggedKeywords: z.array(z.string()).describe('Keywords flagged by the scanner in the reframed message.'),
    aiAssessment: z.string().describe('AI model’s assessment of the reframed message, or "BLOCKED" if safety filters were triggered.'),
    isAiBlocked: z.boolean().describe('True if the AI model blocked the reframed message due to safety filters.'),
  }).describe('Safety details for the reframed message.'),
});
export type MessageSafetyCheckOutput = z.infer<typeof MessageSafetyCheckOutputSchema>;

// --- Combined AI Safety Check ---

const CombinedSafetyCheckInputSchema = z.object({
  originalMessage: z.string(),
  reframedMessage: z.string(),
});

const SingleSafetyAssessmentSchema = z.object({
  aiAssessment: z.string().describe('AI model’s assessment of the message. Should be "SAFE" if appropriate, or a brief explanation of why it is unsafe.'),
  isAiBlocked: z.boolean().describe('True if the AI model would block this message due to safety filters.'),
});

const CombinedSafetyCheckOutputInternalSchema = z.object({
  original: SingleSafetyAssessmentSchema,
  reframed: SingleSafetyAssessmentSchema,
});


const combinedSafetyCheckPrompt = ai.definePrompt({
  name: 'combinedSafetyCheckPrompt',
  input: { schema: CombinedSafetyCheckInputSchema },
  output: { schema: CombinedSafetyCheckOutputInternalSchema },
  prompt: `You are a safety moderator for an educational app. Evaluate the following two messages for their suitability in an educational environment. For each message, provide a brief assessment. If a message is completely appropriate, set the aiAssessment to "SAFE". If it is UNSAFE, briefly describe why. Also, indicate if the content would be blocked by safety filters.

Original Message: "{{originalMessage}}"
Reframed Message: "{{reframedMessage}}"

Your final output must be a valid JSON object that strictly follows the provided schema.`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  }
});


// --- Main Genkit Flow Definition ---

const messageSafetyCheckFlow = ai.defineFlow(
  {
    name: 'messageSafetyCheckFlow',
    inputSchema: MessageSafetyCheckInputSchema,
    outputSchema: MessageSafetyCheckOutputSchema,
  },
  async (input) => {
    // 1. Keyword scanning for both messages
    const originalKeywordScan = await keywordScannerTool({ message: input.originalMessage });
    const reframedKeywordScan = await keywordScannerTool({ message: input.reframedMessage });

    // 2. Combined AI model safety assessment
    let originalAiDetails: { aiAssessment: string; isAiBlocked: boolean; };
    let reframedAiDetails: { aiAssessment: string; isAiBlocked: boolean; };

    try {
      const { output, text, finishReason } = await combinedSafetyCheckPrompt(input);
      
      if (!output || finishReason === 'blocked' || !text) {
         throw new Error('AI safety check was blocked or did not return an output.');
      }
      originalAiDetails = output.original;
      reframedAiDetails = output.reframed;

    } catch (error: any) {
      // If the entire call fails (e.g., due to a very problematic prompt), mark both as blocked.
      const blockedAssessment = {
        aiAssessment: `BLOCKED by AI safety filters: ${error.message || 'An unexpected error occurred.'}`,
        isAiBlocked: true,
      };
      originalAiDetails = blockedAssessment;
      reframedAiDetails = blockedAssessment;
    }
    
    // Determine overall safety
    const isOriginalSafe = originalKeywordScan.isSafe && !originalAiDetails.isAiBlocked && originalAiDetails.aiAssessment.toUpperCase() === 'SAFE';
    const isReframedSafe = reframedKeywordScan.isSafe && !reframedAiDetails.isAiBlocked && reframedAiDetails.aiAssessment.toUpperCase() === 'SAFE';

    return {
      originalMessageSafety: {
        isSafe: isOriginalSafe,
        flaggedKeywords: originalKeywordScan.flaggedKeywords,
        aiAssessment: originalAiDetails.aiAssessment,
        isAiBlocked: originalAiDetails.isAiBlocked,
      },
      reframedMessageSafety: {
        isSafe: isReframedSafe,
        flaggedKeywords: reframedKeywordScan.flaggedKeywords,
        aiAssessment: reframedAiDetails.aiAssessment,
        isAiBlocked: reframedAiDetails.isAiBlocked,
      },
    };
  }
);

// --- Exported Wrapper Function ---

export async function messageSafetyCheck(
  input: MessageSafetyCheckInput
): Promise<MessageSafetyCheckOutput> {
  return messageSafetyCheckFlow(input);
}
