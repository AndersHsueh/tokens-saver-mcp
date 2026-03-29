import { z } from "zod";

export const SummarizeInputSchema = z.object({
  text: z.string().min(1).describe("Long text to summarize"),
  summary_style: z
    .enum(["brief", "bullet", "decision"])
    .describe("Summarization style: brief paragraph, bullet points, or decision-focused"),
  max_points: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of bullet points (default: 6)"),
});

export const SummarizeOutputSchema = z.object({
  summary: z.string().describe("Short summary paragraph"),
  bullets: z.array(z.string()).describe("Key bullet points"),
  risks: z.array(z.string()).describe("Identified risks or concerns"),
});

export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;
export type SummarizeOutput = z.infer<typeof SummarizeOutputSchema>;
