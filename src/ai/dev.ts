
import { config } from 'dotenv';
config();

import '@/ai/flows/voice-message-transcription.ts';
import '@/ai/flows/ai-message-rephrasing.ts';
import '@/ai/flows/translate-text.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/simplify-message.ts';
import '@/ai/flows/content-integrity-check.ts';
