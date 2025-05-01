'use server';

/**
 * @fileOverview Evaluates call recordings based on predefined metrics.
 *
 * - evaluateCallQuality - A function that evaluates call quality and returns scores for various metrics.
 * - EvaluateCallQualityInput - The input type for the evaluateCallQuality function.
 * - EvaluateCallQualityOutput - The return type for the evaluateCallQuality function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {transcribeAudio} from '@/services/speech-to-text';

const EvaluateCallQualityInputSchema = z.object({
  audioStorageUrl: z
    .string()
    .describe('The Cloud Storage URL of the audio file to evaluate.'),
});
export type EvaluateCallQualityInput = z.infer<typeof EvaluateCallQualityInputSchema>;

const EvaluateCallQualityOutputSchema = z.object({
  greetingCompliance: z
    .number()
    .min(1)
    .max(5)
    .describe('Score (1-5) for greeting compliance.'),
  scriptAdherence: z
    .number()
    .min(1)
    .max(5)
    .describe('Score (1-5) for script adherence.'),
  empathyExpression: z
    .number()
    .min(1)
    .max(5)
    .describe('Score (1-5) for empathy expression.'),
  resolutionConfirmation: z
    .number()
    .min(1)
    .max(5)
    .describe('Score (1-5) for resolution confirmation.'),
  callDuration: z
    .number()
    .min(1)
    .max(5)
    .describe('Score (1-5) for call duration appropriateness.'),
  overallRating: z.number().min(1).max(5).describe('Overall rating (1-5) for the call.'),
});
export type EvaluateCallQualityOutput = z.infer<typeof EvaluateCallQualityOutputSchema>;

export async function evaluateCallQuality(input: EvaluateCallQualityInput): Promise<EvaluateCallQualityOutput> {
  return evaluateCallQualityFlow(input);
}

const evaluateCallQualityPrompt = ai.definePrompt({
  name: 'evaluateCallQualityPrompt',
  input: {
    schema: z.object({
      transcription: z
        .string()
        .describe('The transcription of the call recording.'),
    }),
  },
  output: {
    schema: EvaluateCallQualityOutputSchema,
  },
  prompt: `You are a call quality assurance expert. Evaluate the following call transcription based on the following metrics, and provide an overall rating.

Greeting Compliance: Did the agent greet the customer appropriately at the beginning of the call? Score 1-5.
Script Adherence: Did the agent follow the prescribed script throughout the conversation? Score 1-5.
Empathy Expression: Did the agent express empathy during the call? Score 1-5.
Resolution Confirmation: Did the agent confirm the resolution of the customer\'s issue? Score 1-5.
Call Duration: Was the call duration within the acceptable range? Score 1-5.
Overall Rating: Provide an overall rating for the call from 1-5.

Transcription: {{{transcription}}}`,
});

const evaluateCallQualityFlow = ai.defineFlow<
  typeof EvaluateCallQualityInputSchema,
  typeof EvaluateCallQualityOutputSchema
>(
  {
    name: 'evaluateCallQualityFlow',
    inputSchema: EvaluateCallQualityInputSchema,
    outputSchema: EvaluateCallQualityOutputSchema,
  },
  async input => {
    const {text: transcription} = await transcribeAudio(input.audioStorageUrl);
    const {output} = await evaluateCallQualityPrompt({
      transcription,
    });
    return output!;
  }
);
