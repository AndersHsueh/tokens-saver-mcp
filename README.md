# tokens-saver-mcp

A local MCP (Model Context Protocol) server that wraps a local GLM-4.7-Flash model with 7 narrow-purpose tools. The goal is to offload low-risk, structured, short-output sub-tasks from the main model to reduce token consumption.

## Tools

| Tool | Purpose |
|------|---------|
| `local_classify` | Classify text into a given label set |
| `local_extract_json` | Extract structured fields from long text |
| `local_summarize_long_text` | Compress long text to a short summary |
| `local_rewrite` | Rewrite text in a different style without changing facts |
| `local_codegen_small_patch` | Generate small code snippets or function-level patches |
| `local_diff_digest` | Compress a diff into structured behavior change summary |
| `local_task_extract` | Extract actionable tasks from unstructured text |

## Requirements

- Node.js >= 20
- A running OpenAI-compatible API endpoint (e.g., LM Studio, Ollama) with GLM-4.7-Flash loaded

## Setup

```bash
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env if needed (default: http://127.0.0.1:1234, zai-org/glm-4.7-flash)

npm run build
```

## Usage

```bash
# Run as MCP server (stdio transport)
npm start
```

### Claude Code integration

Add to your Claude Code MCP config:

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
npm test          # Run tests
npm run typecheck # Type check only
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ZAI_BASE_URL` | `http://127.0.0.1:1234` | OpenAI-compatible API base URL |
| `ZAI_MODEL` | `zai-org/glm-4.7-flash` | Model name |
| `ZAI_API_KEY` | `` | API key (usually empty for local) |
| `GLM_TIMEOUT_MS` | `20000` | Request timeout in ms |
| `GLM_MAX_RETRIES` | `2` | Max retries for transient errors |
| `GLM_TEMPERATURE` | `0.2` | Default sampling temperature |
