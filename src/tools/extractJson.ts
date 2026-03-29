import type { Provider } from "../providers/types.js";
import { extractJsonPrompt } from "../prompts/extractJson.js";
import { ExtractJsonInputSchema, ExtractJsonOutputSchema } from "../schemas/extractJson.js";
import type { ExtractJsonInput, ExtractJsonOutput } from "../schemas/extractJson.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runExtractJson(
  provider: Provider,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: ExtractJsonOutput }> {
  const parsed = ExtractJsonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: ExtractJsonInput = parsed.data;

  const userPrompt = [
    `Schema description: ${input.schema_description}`,
    `Extraction goal: ${input.extraction_goal}`,
    `Text:\n${input.text}`,
  ].join("\n\n");

  try {
    const result = await provider.generateJson<ExtractJsonOutput>({
      toolName: "tsm_extract_json",
      systemPrompt: extractJsonPrompt,
      userPrompt,
      outputSchema: ExtractJsonOutputSchema,
      maxOutputTokens: 1024,
      temperature: 0.1,
    });

    const fieldCount = Object.keys(result.data).length;
    const missingCount = result.missing_fields.length;
    const content = `Extracted ${fieldCount} field(s). Missing: ${missingCount > 0 ? result.missing_fields.join(", ") : "none"}.`;
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) throw new Error(formatGlmError(err));
    throw err;
  }
}
