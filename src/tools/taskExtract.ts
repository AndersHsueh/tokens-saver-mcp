import type { Provider } from "../providers/types.js";
import { taskExtractPrompt } from "../prompts/taskExtract.js";
import { TaskExtractInputSchema, TaskExtractOutputSchema } from "../schemas/taskExtract.js";
import type { TaskExtractInput, TaskExtractOutput } from "../schemas/taskExtract.js";
import { formatGlmError, GlmError } from "../utils/errors.js";

export async function runTaskExtract(
  provider: Provider,
  rawInput: unknown,
): Promise<{ content: string; structuredContent: TaskExtractOutput }> {
  const parsed = TaskExtractInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`);
  }
  const input: TaskExtractInput = parsed.data;

  const userPrompt = [
    `Task granularity: ${input.task_granularity}`,
    `Text:\n${input.text}`,
  ].join("\n\n");

  try {
    const result = await provider.generateJson<TaskExtractOutput>({
      toolName: "tsm_task_extract",
      systemPrompt: taskExtractPrompt,
      userPrompt,
      outputSchema: TaskExtractOutputSchema,
      maxOutputTokens: 1024,
      temperature: 0.1,
    });

    const taskSummary = result.tasks
      .slice(0, 3)
      .map((t) => `- [${t.status}] ${t.title}`)
      .join("\n");
    const content = `Extracted ${result.tasks.length} task(s):\n${taskSummary}${result.tasks.length > 3 ? "\n…" : ""}`;
    return { content, structuredContent: result };
  } catch (err) {
    if (err instanceof GlmError) throw new Error(formatGlmError(err));
    throw err;
  }
}
