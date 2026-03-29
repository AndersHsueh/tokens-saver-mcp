#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadSettings } from "./config/settings.js";
import { ProviderRegistry } from "./providers/registry.js";
import { ClassifyInputSchema } from "./schemas/classify.js";
import { ExtractJsonInputSchema } from "./schemas/extractJson.js";
import { SummarizeInputSchema } from "./schemas/summarize.js";
import { RewriteInputSchema } from "./schemas/rewrite.js";
import { CodegenInputSchema } from "./schemas/codegen.js";
import { DiffDigestInputSchema } from "./schemas/diffDigest.js";
import { TaskExtractInputSchema } from "./schemas/taskExtract.js";
import { runClassify } from "./tools/classify.js";
import { runExtractJson } from "./tools/extractJson.js";
import { runSummarize } from "./tools/summarize.js";
import { runRewrite } from "./tools/rewrite.js";
import { runCodegen } from "./tools/codegen.js";
import { runDiffDigest } from "./tools/diffDigest.js";
import { runTaskExtract } from "./tools/taskExtract.js";

let settings;
try {
  settings = loadSettings();
} catch (err) {
  process.stderr.write(`[tsm] Failed to load settings: ${String(err)}\n`);
  process.exit(1);
}

const registry = new ProviderRegistry(settings);

const server = new McpServer({
  name: "tokens-saver-mcp",
  version: "0.2.0",
});

function zodToShape<T extends Record<string, import("zod").ZodTypeAny>>(
  schema: import("zod").ZodObject<T>,
) {
  return schema.shape;
}

server.tool(
  "tsm_classify",
  "Classify text into one of the provided labels using a budget model. Returns label, confidence score, and a brief reason. Useful for intent classification, routing decisions, and tagging.",
  zodToShape(ClassifyInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_classify");
    const result = await runClassify(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_extract_json",
  "Extract structured fields from long text according to a schema description. Returns a JSON object with extracted data and a list of missing fields. Useful for parsing documents, issues, logs.",
  zodToShape(ExtractJsonInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_extract_json");
    const result = await runExtractJson(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_summarize",
  "Compress long text into a concise summary with bullet points and risk flags. Useful for compressing long conversations, logs, documents, or diff context before passing to the main model.",
  zodToShape(SummarizeInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_summarize");
    const result = await runSummarize(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_rewrite",
  "Rewrite text in a different style (concise, formal, technical, friendly, or translate between Chinese and English) without changing the core facts.",
  zodToShape(RewriteInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_rewrite");
    const result = await runRewrite(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_codegen_small_patch",
  "Generate small code snippets or function-level patches using a budget model. Scoped to single functions, regex, SQL, scripts, or unit test samples. NOT for multi-file or architectural designs.",
  zodToShape(CodegenInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_codegen_small_patch");
    const result = await runCodegen(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_diff_digest",
  "Compress a git diff into a structured summary of changed areas, behavior changes, risks, and a one-paragraph overview. Helps the main model quickly understand large diffs.",
  zodToShape(DiffDigestInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_diff_digest");
    const result = await runDiffDigest(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "tsm_task_extract",
  "Extract an actionable task list from unstructured text (meeting notes, daily reports, requirements). Returns tasks with optional owner, due date, status, and notes.",
  zodToShape(TaskExtractInputSchema),
  async (input) => {
    const provider = registry.getForTool("tsm_task_extract");
    const result = await runTaskExtract(provider, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[tsm] tokens-saver-mcp v0.2.0 started (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`[tsm] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
