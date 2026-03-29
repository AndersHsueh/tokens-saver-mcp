import { z } from "zod";

export const CodegenInputSchema = z.object({
  task: z.string().min(1).describe("Description of what the code snippet should do"),
  language: z.string().optional().describe("Target programming language"),
  existing_code: z.string().optional().describe("Existing code context for the patch"),
  constraints: z.string().optional().describe("Additional constraints or requirements"),
});

export const CodegenOutputSchema = z.object({
  code: z.string().describe("Generated code snippet"),
  explanation: z.string().describe("Brief explanation, max 3 sentences"),
  risk_notes: z.array(z.string()).describe("Potential risks or caveats"),
});

export type CodegenInput = z.infer<typeof CodegenInputSchema>;
export type CodegenOutput = z.infer<typeof CodegenOutputSchema>;
