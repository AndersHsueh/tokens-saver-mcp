#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { GlmClient } from "./client/glmClient.js";
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

const config = loadConfig();
const client = new GlmClient(config);

const server = new McpServer({
  name: "tokens-saver-mcp",
  version: "0.1.0",
});

// Helper: convert Zod schema to JSON Schema shape for MCP tool registration
function zodToShape<T extends Record<string, import("zod").ZodTypeAny>>(
  schema: import("zod").ZodObject<T>,
) {
  return schema.shape;
}

server.tool(
  "local_classify",
  "Classify text into one of the provided labels using a local model. Returns label, confidence score, and a brief reason. Useful for intent classification, routing decisions, and tagging.",
  zodToShape(ClassifyInputSchema),
  async (input) => {
    const result = await runClassify(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_extract_json",
  "Extract structured fields from long text according to a schema description. Returns a JSON object with extracted data and a list of missing fields. Useful for parsing documents, issues, logs.",
  zodToShape(ExtractJsonInputSchema),
  async (input) => {
    const result = await runExtractJson(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_summarize_long_text",
  "Compress long text into a concise summary with bullet points and risk flags. Useful for compressing long conversations, logs, documents, or diff context before passing to the main model.",
  zodToShape(SummarizeInputSchema),
  async (input) => {
    const result = await runSummarize(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_rewrite",
  "Rewrite text in a different style (concise, formal, technical, friendly, or translate between Chinese and English) without changing the core facts.",
  zodToShape(RewriteInputSchema),
  async (input) => {
    const result = await runRewrite(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_codegen_small_patch",
  "Generate small code snippets or function-level patches. Scoped to single functions, regex, SQL, scripts, or unit test samples. NOT for multi-file or architectural designs.",
  zodToShape(CodegenInputSchema),
  async (input) => {
    const result = await runCodegen(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_diff_digest",
  "Compress a git diff into a structured summary of changed areas, behavior changes, risks, and a one-paragraph overview. Helps the main model quickly understand large diffs.",
  zodToShape(DiffDigestInputSchema),
  async (input) => {
    const result = await runDiffDigest(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

server.tool(
  "local_task_extract",
  "Extract an actionable task list from unstructured text (meeting notes, daily reports, requirements). Returns tasks with optional owner, due date, status, and notes.",
  zodToShape(TaskExtractInputSchema),
  async (input) => {
    const result = await runTaskExtract(client, input);
    return {
      content: [{ type: "text", text: result.content }],
      structuredContent: result.structuredContent,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[tokens-saver-mcp] Server started on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`[tokens-saver-mcp] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
