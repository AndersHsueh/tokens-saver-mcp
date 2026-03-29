import type { GlmClient } from "../client/glmClient.js";
import { classifyPrompt } from "../prompts/classify.js";
import { ClassifyInputSchema, ClassifyOutputSchema } from "../schemas/classify.js";
import type { ClassifyInput, ClassifyOutput } from "../schemas/classify.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runClassify(
  client: GlmClient,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: ClassifyOutput }> {
  const parsed = ClassifyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: ClassifyInput = parsed.data;

  const userPrompt = [
    `Labels: ${JSON.stringify(input.labels)}`,
    input.instructions ? `Instructions: ${input.instructions}` : "",
    `Text:\n${input.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await client.callJson<ClassifyOutput>({
      toolName: "local_classify",
      systemPrompt: classifyPrompt,
      userPrompt,
      outputSchema: ClassifyOutputSchema,
      maxOutputTokens: 256,
      temperature: 0.1,
    });

    // Validate that label is from the provided list
    if (!input.labels.includes(result.label)) {
      throw new Error(`Model returned label '${result.label}' not in provided labels list.`);
    }

    const content = `Label: ${result.label} (confidence: ${result.confidence.toFixed(2)})\nReason: ${result.reason}`;
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) {
      throw new Error(formatGlmError(err));
    }
    throw err;
  }
}
