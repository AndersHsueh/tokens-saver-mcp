import type { Provider } from "../providers/types.js";
import { diffDigestPrompt } from "../prompts/diffDigest.js";
import { DiffDigestInputSchema, DiffDigestOutputSchema } from "../schemas/diffDigest.js";
import type { DiffDigestInput, DiffDigestOutput } from "../schemas/diffDigest.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runDiffDigest(
  provider: Provider,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: DiffDigestOutput }> {
  const parsed = DiffDigestInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: DiffDigestInput = parsed.data;

  const userPrompt = [
    input.focus ? `Focus: ${input.focus}` : "",
    `Diff:\n${input.diff_text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await provider.generateJson<DiffDigestOutput>({
      toolName: "tsm_diff_digest",
      systemPrompt: diffDigestPrompt,
      userPrompt,
      outputSchema: DiffDigestOutputSchema,
      maxOutputTokens: 768,
      temperature: 0.1,
    });

    const content = [
      `Changed areas: ${result.changed_areas.join(", ") || "none"}`,
      `Behavior changes: ${result.behavior_changes.length}`,
      `Risks: ${result.risks.length}`,
      result.one_paragraph_summary,
    ].join("\n");
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) throw new Error(formatGlmError(err));
    throw err;
  }
}
