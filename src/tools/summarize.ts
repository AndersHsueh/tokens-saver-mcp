import type { Provider } from "../providers/types.js";
import { summarizePrompt } from "../prompts/summarize.js";
import { SummarizeInputSchema, SummarizeOutputSchema } from "../schemas/summarize.js";
import type { SummarizeInput, SummarizeOutput } from "../schemas/summarize.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runSummarize(
  provider: Provider,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: SummarizeOutput }> {
  const parsed = SummarizeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: SummarizeInput = parsed.data;

  const maxPoints = input.max_points ?? 6;
  const userPrompt = [
    `Style: ${input.summary_style}`,
    `Max bullet points: ${maxPoints}`,
    `Text:\n${input.text}`,
  ].join("\n\n");

  try {
    const result = await provider.generateJson<SummarizeOutput>({
      toolName: "tsm_summarize",
      systemPrompt: summarizePrompt,
      userPrompt,
      outputSchema: SummarizeOutputSchema,
      maxOutputTokens: 512,
      temperature: 0.2,
    });

    const content = `Summary: ${result.summary}\nBullets: ${result.bullets.length}. Risks: ${result.risks.length}.`;
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) throw new Error(formatGlmError(err));
    throw err;
  }
}
