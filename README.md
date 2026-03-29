# tokens-saver-mcp

A provider-agnostic MCP (Model Context Protocol) server that routes 7 narrow text-processing tools to budget models — local or cloud — to reduce main model token consumption.

**Core idea:** offload low-risk, structured, short-output sub-tasks (classification, extraction, summarization, rewriting, small code generation) to cheaper models, keeping complex reasoning and high-risk changes on Claude/GPT.

## Tools

| Tool | Purpose |
|------|---------|
| `tsm_classify` | Classify text into a given label set |
| `tsm_extract_json` | Extract structured fields from long text |
| `tsm_summarize` | Compress long text to a short summary |
| `tsm_rewrite` | Rewrite text in a different style (or translate zh↔en) |
| `tsm_codegen_small_patch` | Generate small code snippets / function-level patches |
| `tsm_diff_digest` | Compress a git diff into a structured change summary |
| `tsm_task_extract` | Extract actionable tasks from unstructured text |

All tools return both human-readable `content` and machine-consumable `structuredContent`.

## Requirements

- Node.js >= 20
- A running provider (local model or cloud API with OpenAI-compatible endpoint)

## Setup

```bash
npm install
npm run build
```

Create `~/.tokens-saver-mcp/settings.json` to configure providers (see below).  
If the file does not exist, the server falls back to a built-in default pointing at `http://127.0.0.1:1234` with `zai-org/glm-4.7-flash`.

## Configuration

**`~/.tokens-saver-mcp/settings.json`**

```json
{
  "defaultProvider": "remote_budget_cn",
  "providers": {
    "local": {
      "type": "openai_compatible",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "apiKeyEnv": "",
      "model": "qwen2.5:14b",
      "timeoutMs": 15000,
      "maxRetries": 1,
      "temperature": 0.1
    },
    "remote_budget_cn": {
      "type": "openai_compatible",
      "baseUrl": "https://api.minimax.chat/compatible-mode/v1",
      "apiKeyEnv": "MINIMAX_API_KEY",
      "model": "MiniMax-M2.7",
      "timeoutMs": 20000,
      "maxRetries": 2,
      "temperature": 0.2
    }
  },
  "toolRouting": {
    "tsm_classify": "local",
    "tsm_extract_json": "remote_budget_cn",
    "tsm_summarize": "remote_budget_cn",
    "tsm_rewrite": "remote_budget_cn",
    "tsm_codegen_small_patch": "remote_budget_cn",
    "tsm_diff_digest": "remote_budget_cn",
    "tsm_task_extract": "local"
  }
}
```

**Key rules:**
- API keys are **never** stored in the config file. Set `apiKeyEnv` to the environment variable name that holds the key.
- For local providers with no auth, set `apiKeyEnv` to `""`.
- `toolRouting` is optional — unrouted tools fall back to `defaultProvider`.

## Usage

```bash
# Run as MCP server (stdio transport)
npm start
```

### Claude Code integration

```json
{
  "mcpServers": {
    "tokens-saver": {
      "command": "node",
      "args": ["/path/to/tokens-saver-mcp/dist/server.js"]
    }
  }
}
```

## Development

```bash
npm test          # Run 61 tests
npm run typecheck # Type check only
npm run build     # Compile TypeScript
```
