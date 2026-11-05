'use server';
/**
 * @fileOverview A Genkit flow for translating text.
 *
 * - translateText - A function that handles the translation process.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  targetLanguage: z.string().describe('The target language to translate to (e.g., "Hindi", "Marathi").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async ({ text, targetLanguage }) => {
    const { text: translatedText } = await ai.generate({
      prompt: `Translate the following text to ${targetLanguage}. Only return the translated text, without any introductory phrases or explanations.\n\nText: "${text}"`,
    });
    
    if (!translatedText) {
        throw new Error('Translation failed to return text.');
    }

    return { translatedText };
  }
);
