import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ProviderConfigSchema = z.object({
  type: z.literal("openai_compatible"),
  baseUrl: z.string().url(),
  /** Environment variable name that holds the API key. Empty string = no key needed. */
  apiKeyEnv: z.string(),
  model: z.string().min(1),
  timeoutMs: z.number().int().positive().default(20000),
  maxRetries: z.number().int().min(0).default(2),
  temperature: z.number().min(0).max(2).default(0.2),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

const ToolNames = [
  "tsm_classify",
  "tsm_extract_json",
  "tsm_summarize",
  "tsm_rewrite",
  "tsm_codegen_small_patch",
  "tsm_diff_digest",
  "tsm_task_extract",
] as const;

export type ToolName = (typeof ToolNames)[number];

const ToolRoutingSchema = z
  .object({
    tsm_classify: z.string().optional(),
    tsm_extract_json: z.string().optional(),
    tsm_summarize: z.string().optional(),
    tsm_rewrite: z.string().optional(),
    tsm_codegen_small_patch: z.string().optional(),
    tsm_diff_digest: z.string().optional(),
    tsm_task_extract: z.string().optional(),
  })
  .default({});

export const SettingsSchema = z.object({
  defaultProvider: z.string().default("local"),
  providers: z.record(z.string(), ProviderConfigSchema).default({}),
  toolRouting: ToolRoutingSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;

// ─── Built-in defaults ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  defaultProvider: "local",
  providers: {
    local: {
      type: "openai_compatible",
      baseUrl: "http://127.0.0.1:1234",
      apiKeyEnv: "",
      model: "zai-org/glm-4.7-flash",
      timeoutMs: 20000,
      maxRetries: 2,
      temperature: 0.2,
    },
  },
  toolRouting: {},
};

// ─── Loader ───────────────────────────────────────────────────────────────────

const SETTINGS_PATH = join(homedir(), ".tokens-saver-mcp", "settings.json");

export function loadSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) {
    return DEFAULT_SETTINGS;
  }

  let raw: string;
  try {
    raw = readFileSync(SETTINGS_PATH, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read settings file at ${SETTINGS_PATH}: ${String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Settings file at ${SETTINGS_PATH} is not valid JSON: ${String(err)}`);
  }

  const result = SettingsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Settings file at ${SETTINGS_PATH} failed validation:\n${result.error.message}`,
    );
  }

  return result.data;
}

/** Resolve the provider name for a given tool, falling back to defaultProvider. */
export function resolveProviderName(settings: Settings, toolName: ToolName): string {
  return settings.toolRouting[toolName] ?? settings.defaultProvider;
}

/** Get a validated ProviderConfig by name, throwing if not found. */
export function getProviderConfig(settings: Settings, providerName: string): ProviderConfig {
  const config = settings.providers[providerName];
  if (!config) {
    const available = Object.keys(settings.providers).join(", ") || "(none)";
    throw new Error(
      `Provider '${providerName}' not found in settings. Available: ${available}`,
    );
  }
  return config;
}

/** Resolve the API key from the environment variable specified in the config. */
export function resolveApiKey(config: ProviderConfig): string {
  if (!config.apiKeyEnv) return "no-key";
  const key = process.env[config.apiKeyEnv];
  if (!key) {
    throw new Error(
      `API key env var '${config.apiKeyEnv}' is not set. ` +
        `Set it in your environment before starting the MCP server.`,
    );
  }
  return key;
}
