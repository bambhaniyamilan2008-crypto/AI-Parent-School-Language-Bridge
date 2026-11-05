'use server';
/**
 * @fileOverview A Genkit flow for transcribing voice messages into text.
 *
 * - voiceMessageTranscription - A function that handles the voice message transcription process.
 * - VoiceMessageTranscriptionInput - The input type for the voiceMessageTranscription function.
 * - VoiceMessageTranscriptionOutput - The return type for the voiceMessageTranscription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceMessageTranscriptionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording of a voice message, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VoiceMessageTranscriptionInput = z.infer<typeof VoiceMessageTranscriptionInputSchema>;

const VoiceMessageTranscriptionOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the voice message.'),
});
export type VoiceMessageTranscriptionOutput = z.infer<typeof VoiceMessageTranscriptionOutputSchema>;

export async function voiceMessageTranscription(input: VoiceMessageTranscriptionInput): Promise<VoiceMessageTranscriptionOutput> {
  return voiceMessageTranscriptionFlow(input);
}

const voiceMessageTranscriptionFlow = ai.defineFlow(
  {
    name: 'voiceMessageTranscriptionFlow',
    inputSchema: VoiceMessageTranscriptionInputSchema,
    outputSchema: VoiceMessageTranscriptionOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: [
        { media: { url: input.audioDataUri } },
        { text: 'Transcribe the spoken words from this audio. The user may speak in a mix of languages including English, Hindi, Gujarati, Marathi, Tamil, Telugu, and Punjabi.' },
      ],
    });
    
    if (!text) {
        throw new Error('Transcription failed: AI model did not return any text.');
    }
    
    return { transcribedText: text };
  }
);
