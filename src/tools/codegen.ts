import type { GlmClient } from "../client/glmClient.js";
import { codegenPrompt } from "../prompts/codegen.js";
import { CodegenInputSchema, CodegenOutputSchema } from "../schemas/codegen.js";
import type { CodegenInput, CodegenOutput } from "../schemas/codegen.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runCodegen(
  client: GlmClient,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: CodegenOutput }> {
  const parsed = CodegenInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: CodegenInput = parsed.data;

  const parts = [`Task: ${input.task}`];
  if (input.language) parts.push(`Language: ${input.language}`);
  if (input.existing_code) parts.push(`Existing code:\n${input.existing_code}`);
  if (input.constraints) parts.push(`Constraints: ${input.constraints}`);
  const userPrompt = parts.join("\n\n");

  try {
    const result = await client.callJson<CodegenOutput>({
      toolName: "local_codegen_small_patch",
      systemPrompt: codegenPrompt,
      userPrompt,
      outputSchema: CodegenOutputSchema,
      maxOutputTokens: 1024,
      temperature: 0.2,
    });

    const codePreview = result.code.length > 60 ? result.code.slice(0, 60) + "…" : result.code;
    const content = `Generated code (${input.language ?? "any"}):\n${codePreview}\n${result.explanation}`;
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) {
      throw new Error(formatGlmError(err));
    }
    throw err;
  }
}
