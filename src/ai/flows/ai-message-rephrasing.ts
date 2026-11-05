
'use server';
/**
 * @fileOverview An AI agent that analyzes, rephrases, and performs safety checks on messages.
 *
 * - aiMediation - A function that handles the message mediation process.
 * - AiMediationInput - The input type for the aiMediation function.
 * - AiMediationOutput - The return type for the aiMediation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const inappropriateKeywords = ['stupid', 'idiot', 'hate', 'kill', 'violence', 'badword', 'swear', 'cuss', 'ass', 'bitch', 'fuck', 'shit', 'damn', 'hell', 'crap', 'porn', 'sex', 'nude', 'bomb', 'terrorist', 'weapon', 'threat', 'attack', 'harm', 'abuse', 'bully', 'racist', 'sexist', 'homophobic'];

function scanKeywords(message: string): { isSafe: boolean; flaggedKeywords: string[] } {
    const messageLower = message.toLowerCase();
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

const AiMediationInputSchema = z.object({
  audioDataUri: z
    .string()
    .optional()
    .describe(
      "An audio recording of a voice message, as a data URI."
    ),
  textMessage: z
    .string()
    .optional()
    .describe("A text message typed by the user."),
});
export type AiMediationInput = z.infer<typeof AiMediationInputSchema>;

const MessageSafetyCheckOutputSchema = z.object({
  originalMessageSafety: z.object({
    isSafe: z.boolean(),
    flaggedKeywords: z.array(z.string()),
    aiAssessment: z.string(),
    isAiBlocked: z.boolean(),
  }),
  reframedMessageSafety: z.object({
    isSafe: z.boolean(),
    flaggedKeywords: z.array(z.string()),
    aiAssessment: z.string(),
    isAiBlocked: z.boolean(),
  }),
});

const AiMediationOutputSchema = z.object({
  originalMessage: z.string(),
  originalSentiment: z.enum(['Negative', 'Neutral', 'Positive']),
  rephrasedMessage: z.string(),
  explanation: z.string(),
  safety: MessageSafetyCheckOutputSchema,
});
export type AiMediationOutput = z.infer<typeof AiMediationOutputSchema>;

const AiMediationPromptOutputSchema = z.object({
  originalMessage: z.string().describe("The user's message, consolidated from voice and text, transcribed and translated into English."),
  originalSentiment: z
    .enum(['Negative', 'Neutral', 'Positive'])
    .describe('The detected sentiment of the original English message.'),
  rephrasedMessage: z
    .string()
    .describe(
      'The rephrased, supportive, and well-crafted version of the message.'
    ),
  explanation: z
    .string()
    .describe(
      'A brief explanation of how the message was rephrased and why.'
    ),
  safetyAssessment: z.object({
      original: z.object({
          aiAssessment: z.string().describe('AI model’s assessment of the original message. Should be "SAFE" if appropriate, or a brief explanation of why it is unsafe.'),
          isAiBlocked: z.boolean().describe('True if the AI model would block the original message due to safety filters.'),
      }),
      reframed: z.object({
          aiAssessment: z.string().describe('AI model’s assessment of the reframed message. Should be "SAFE" if appropriate, or a brief explanation of why it is unsafe.'),
          isAiBlocked: z.boolean().describe('True if the AI model would block the reframed message due to safety filters.'),
      }),
  }).describe("The AI's safety assessment of both messages.")
});

export async function aiMediation(
  input: AiMediationInput
): Promise<AiMediationOutput> {
  return aiMediationFlow(input);
}

const aiMediationPrompt = ai.definePrompt({
  name: 'aiMediationPrompt',
  input: {schema: AiMediationInputSchema},
  output: {schema: AiMediationPromptOutputSchema},
  prompt: `You are an AI-powered education mediator and safety moderator. Your task is to analyze a user's input, rephrase it into a more constructive and neutral tone, and assess its safety for an educational context.

The user can provide a voice message, a written message, or both. 
{{#if audioDataUri}}
Voice input: {{media url=audioDataUri}}
{{/if}}
{{#if textMessage}}
Written input: "{{textMessage}}"
{{/if}}

Please perform the following steps and return a single JSON object with the results:

1.  **Consolidate and Translate**: Combine the meaning of the voice message and written message into a single, clear English text. If only one is provided, use that. This will be the 'originalMessage'.
2.  **Analyze Sentiment**: Identify the sentiment of the English 'originalMessage' (Negative, Neutral, or Positive).
3.  **Create a Supportive Message**: Rephrase the user's message into a "Supportive Message".
    *   Transform any message into a constructive, encouraging, and polite version. 
    *   The final 'rephrasedMessage' should always be a high-quality, kind, and supportive sentence that improves upon the original.
4.  **Provide Explanation**: Briefly explain in English how you transformed the original message into the 'rephrasedMessage'.
5.  **Assess Safety**: Evaluate both 'originalMessage' and 'rephrasedMessage' for suitability in an educational environment.
    *   For each, provide a brief assessment. Use "SAFE" or describe why it is UNSAFE.
    *   Indicate if content would be blocked by safety filters (isAiBlocked).

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

const aiMediationFlow = ai.defineFlow(
  {
    name: 'aiMediationFlow',
    inputSchema: AiMediationInputSchema,
    outputSchema: AiMediationOutputSchema,
  },
  async (input) => {
    let promptOutput;

    try {
      const { output, finishReason } = await aiMediationPrompt(input);
      if (!output || finishReason === 'blocked') {
         throw new Error('AI mediation was blocked or did not return an output.');
      }
      promptOutput = output;
    } catch(error: any) {
        throw new Error(`AI mediation prompt failed: ${error.message || 'An unexpected error occurred.'}`);
    }

    const { originalMessage, rephrasedMessage, safetyAssessment } = promptOutput;

    if (!originalMessage || originalMessage.trim() === '') {
        throw new Error('Could not understand the input. Please try again with clear speech or text.');
    }

    const originalKeywordScan = scanKeywords(originalMessage);
    const reframedKeywordScan = scanKeywords(rephrasedMessage);

    const isOriginalSafe = originalKeywordScan.isSafe && !safetyAssessment.original.isAiBlocked && safetyAssessment.original.aiAssessment.toUpperCase() === 'SAFE';
    const isReframedSafe = reframedKeywordScan.isSafe && !safetyAssessment.reframed.isAiBlocked && safetyAssessment.reframed.aiAssessment.toUpperCase() === 'SAFE';

    return {
      originalMessage: promptOutput.originalMessage,
      originalSentiment: promptOutput.originalSentiment,
      rephrasedMessage: promptOutput.rephrasedMessage,
      explanation: promptOutput.explanation,
      safety: {
        originalMessageSafety: {
            isSafe: isOriginalSafe,
            flaggedKeywords: originalKeywordScan.flaggedKeywords,
            aiAssessment: safetyAssessment.original.aiAssessment,
            isAiBlocked: safetyAssessment.original.isAiBlocked,
        },
        reframedMessageSafety: {
            isSafe: isReframedSafe,
            flaggedKeywords: reframedKeywordScan.flaggedKeywords,
            aiAssessment: safetyAssessment.reframed.aiAssessment,
            isAiBlocked: safetyAssessment.reframed.isAiBlocked,
        },
      }
    };
  }
);
