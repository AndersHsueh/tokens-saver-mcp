import type { GlmClient } from "../client/glmClient.js";
import { rewritePrompt } from "../prompts/rewrite.js";
import { RewriteInputSchema, RewriteOutputSchema } from "../schemas/rewrite.js";
import type { RewriteInput, RewriteOutput } from "../schemas/rewrite.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runRewrite(
  client: GlmClient,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: RewriteOutput }> {
  const parsed = RewriteInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: RewriteInput = parsed.data;

  const userPrompt = [
    `Style: ${input.style}`,
    input.constraints ? `Constraints: ${input.constraints}` : "",
    `Text:\n${input.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Rewrite returns plain text, wrap into structured output
  try {
    const rawText = await client.callText({
      toolName: "local_rewrite",
      systemPrompt: rewritePrompt,
      userPrompt,
      maxOutputTokens: 1024,
      temperature: input.style === "concise" ? 0.2 : 0.3,
    });

    const result: RewriteOutput = { rewritten_text: rawText };
    const validated = RewriteOutputSchema.safeParse(result);
    if (!validated.success) {
      throw new Error(`Rewrite schema validation failed: ${validated.error.message}`);
    }

    const preview = rawText.length > 80 ? rawText.slice(0, 80) + "…" : rawText;
    return { content: `Rewritten (${input.style}): ${preview}`, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) {
      throw new Error(formatGlmError(err));
    }
    throw err;
  }
}
