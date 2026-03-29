import type { Provider } from "../providers/types.js";
import { rewritePrompt } from "../prompts/rewrite.js";
import { RewriteInputSchema, RewriteOutputSchema } from "../schemas/rewrite.js";
import type { RewriteInput, RewriteOutput } from "../schemas/rewrite.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runRewrite(
  provider: Provider,
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

  try {
    const rawText = await provider.generateText({
      toolName: "tsm_rewrite",
      systemPrompt: rewritePrompt,
      userPrompt,
      maxOutputTokens: 1024,
      temperature: input.style === "concise" ? 0.2 : 0.3,
    });

    const result: RewriteOutput = { rewritten_text: rawText };
    const preview = rawText.length > 80 ? rawText.slice(0, 80) + "…" : rawText;
    return { content: `Rewritten (${input.style}): ${preview}`, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) throw new Error(formatGlmError(err));
    throw err;
  }
}
