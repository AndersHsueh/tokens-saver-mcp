import { z } from "zod";

export const ClassifyInputSchema = z.object({
  text: z.string().min(1).describe("Text to classify"),
  labels: z.array(z.string().min(1)).min(2).describe("List of possible labels"),
  instructions: z.string().optional().describe("Optional classification instructions"),
});

export const ClassifyOutputSchema = z.object({
  label: z.string().describe("Chosen label from the provided list"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0.0-1.0"),
  reason: z.string().describe("1-2 sentence explanation"),
});

export type ClassifyInput = z.infer<typeof ClassifyInputSchema>;
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;
