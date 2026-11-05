'use server';
/**
 * @fileOverview A Genkit flow for simplifying formal school messages.
 *
 * - simplifySchoolMessage - A function that handles the message simplification process.
 * - SimplifyMessageInput - The input type for the simplifySchoolMessage function.
 * - SimplifyMessageOutput - The return type for the simplifySchoolMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SimplifyMessageInputSchema = z.object({
  originalMessage: z.string().describe('The formal or complicated school notice to simplify.'),
});
export type SimplifyMessageInput = z.infer<typeof SimplifyMessageInputSchema>;

const SimplifyMessageOutputSchema = z.object({
  simplifiedMessage: z.string().describe('The simplified, parent-friendly version of the notice.'),
});
export type SimplifyMessageOutput = z.infer<typeof SimplifyMessageOutputSchema>;

export async function simplifySchoolMessage(input: SimplifyMessageInput): Promise<SimplifyMessageOutput> {
  return simplifySchoolMessageFlow(input);
}

const simplifySchoolMessageFlow = ai.defineFlow(
  {
    name: 'simplifySchoolMessageFlow',
    inputSchema: SimplifyMessageInputSchema,
    outputSchema: SimplifyMessageOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: `You are an expert school communication assistant. Your task is to convert formal or complicated school notices into simple, clear language that is easy for parents to understand.

TASK GUIDELINES:
1. Use short and easy-to-understand sentences.
2. Make the message friendly and welcoming.
3. PRESERVE THE ORIGINAL MEANING EXACTLY.
4. CRITICAL: Maintain all important dates, times, names (students/teachers), locations, amounts, deadlines, and specific instructions.
5. NEVER invent additional information or remove important details.
6. Maintain a respectful and professional school tone.
7. Generate the simplified message in the SAME LANGUAGE as the original message. Do not translate.

Original Message:
"${input.originalMessage}"

Return only the simplified message text, without any introductory phrases or explanations.`,
    });

    if (!text) {
      throw new Error('Simplification failed: AI model did not return any text.');
    }

    return { simplifiedMessage: text };
  }
);
