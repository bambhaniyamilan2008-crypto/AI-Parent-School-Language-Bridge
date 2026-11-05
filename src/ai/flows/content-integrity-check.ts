
'use server';
/**
 * @fileOverview A Genkit flow for checking the integrity and quality of school message simplifications and translations.
 *
 * - checkContentIntegrity - A function that cross-references critical info between source and target text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntegrityIssueSchema = z.object({
  category: z.enum(['date', 'time', 'number', 'name', 'instruction', 'other']),
  originalValue: z.string().describe('The specific value found in the original source.'),
  targetValue: z.string().describe('The corresponding value found in the target (simplified/translated) text.'),
  explanation: z.string().describe('Short explanation of why this might be a mismatch or concern.'),
});

const IntegrityCheckOutputSchema = z.object({
  status: z.enum(['clean', 'warning']),
  issues: z.array(IntegrityIssueSchema),
});

const IntegrityCheckInputSchema = z.object({
  originalMessage: z.string().describe('The source of truth text.'),
  targetMessage: z.string().describe('The text to be checked (simplified version or translation).'),
  context: z.enum(['simplification', 'translation']).describe('Whether we are checking a simplification (same lang) or translation (diff lang).'),
  targetLanguage: z.string().optional().describe('The language of the target message, if translation.'),
});

export type IntegrityCheckInput = z.infer<typeof IntegrityCheckInputSchema>;
export type IntegrityCheckOutput = z.infer<typeof IntegrityCheckOutputSchema>;

export async function checkContentIntegrity(input: IntegrityCheckInput): Promise<IntegrityCheckOutput> {
  return checkContentIntegrityFlow(input);
}

const checkContentIntegrityFlow = ai.defineFlow(
  {
    name: 'checkContentIntegrityFlow',
    inputSchema: IntegrityCheckInputSchema,
    outputSchema: IntegrityCheckOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: `You are an expert school communication auditor. Your task is to ensure that a simplified or translated version of a school notice has accurately preserved all CRITICAL information from the original message.

SOURCE TEXT (Original):
"${input.originalMessage}"

TARGET TEXT (To check):
"${input.targetMessage}"

CONTEXT: This is a ${input.context}${input.targetLanguage ? ` into ${input.targetLanguage}` : ''}.

TASK:
1. Identify all critical data in the SOURCE: Dates, Times, Deadlines, Numbers, Fees, Amounts, Names (Students/Teachers/Schools), Locations, URLs, Contact Info, and specific Instructions.
2. Verify if this data is present and accurate in the TARGET.
3. Note that in translations, dates and numbers might use regional formatting (e.g. 1st January vs ૦૧ જાન્યુઆરી)—these are NOT errors.
4. Note that simplification often shortens sentences but must keep ALL important facts.

Return a JSON object with:
- "status": "clean" if everything looks good, or "warning" if there are potential mismatches or omissions.
- "issues": An array of issue objects, each with category, originalValue, targetValue (or "MISSING"), and explanation.

Return ONLY valid JSON.`,
    });

    if (!text) {
      throw new Error('Integrity check failed: No response from AI.');
    }

    try {
      // Find the JSON block if AI wrapped it in markdown
      const jsonStr = text.includes('```json') 
        ? text.split('```json')[1].split('```')[0] 
        : text.includes('```') 
          ? text.split('```')[1].split('```')[0]
          : text;

      const parsed = JSON.parse(jsonStr.trim());
      return parsed as IntegrityCheckOutput;
    } catch (e) {
      console.error("Failed to parse integrity check JSON", text);
      throw new Error('Integrity check failed: Invalid format.');
    }
  }
);
