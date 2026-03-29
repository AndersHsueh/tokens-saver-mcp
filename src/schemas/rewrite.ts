import { z } from "zod";

export const RewriteInputSchema = z.object({
  text: z.string().min(1).describe("Text to rewrite"),
  style: z
    .enum(["concise", "formal", "technical", "friendly", "cn_en_translation", "en_cn_translation"])
    .describe("Target rewriting style"),
  constraints: z.string().optional().describe("Optional additional constraints for rewriting"),
});

export const RewriteOutputSchema = z.object({
  rewritten_text: z.string().describe("The rewritten text"),
});

export type RewriteInput = z.infer<typeof RewriteInputSchema>;
export type RewriteOutput = z.infer<typeof RewriteOutputSchema>;
