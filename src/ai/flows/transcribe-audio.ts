// src/ai/flows/transcribe-audio.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for transcribing audio from a Cloud Storage URL.
 *
 * - transcribeAudioFlow - A function that orchestrates the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudioFlow function.
 * - TranscribeAudioOutput - The output type for the transcribeAudioFlow function.
 */

import {ai} from '@/ai/ai-instance';
import {transcribeAudio, TranscriptionResult} from '@/services/speech-to-text';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  storageUrl: z.string().describe('The Cloud Storage URL of the audio file to transcribe.'),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio file.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

/**
 * Transcribes audio from a given Cloud Storage URL using a speech-to-text service.
 *
 * @param input - The input object containing the Cloud Storage URL.
 * @returns A promise that resolves to an object containing the transcribed text.
 */
export async function transcribeAudioFlow(
  input: TranscribeAudioInput
): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlowInner(input);
}

const transcribeAudioFlowInner = ai.defineFlow<
  typeof TranscribeAudioInputSchema,
  typeof TranscribeAudioOutputSchema
>({
  name: 'transcribeAudioFlow',
  inputSchema: TranscribeAudioInputSchema,
  outputSchema: TranscribeAudioOutputSchema,
},
async input => {
  const transcriptionResult: TranscriptionResult = await transcribeAudio(input.storageUrl);
  return {
    transcription: transcriptionResult.text,
  };
});