import { z } from "zod";

export const DiffDigestInputSchema = z.object({
  diff_text: z.string().min(1).describe("Git diff or patch text to analyze"),
  focus: z
    .enum(["behavior", "risk", "summary"])
    .optional()
    .describe("Analysis focus: behavior changes, risks, or general summary"),
});

export const DiffDigestOutputSchema = z.object({
  changed_areas: z.array(z.string()).describe("Files, modules, or functions that changed"),
  behavior_changes: z.array(z.string()).describe("Observable behavior differences"),
  risks: z.array(z.string()).describe("Potential concerns from the changes"),
  one_paragraph_summary: z.string().describe("2-3 sentence overall summary"),
});

export type DiffDigestInput = z.infer<typeof DiffDigestInputSchema>;
export type DiffDigestOutput = z.infer<typeof DiffDigestOutputSchema>;
