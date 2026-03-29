import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSettings, resolveProviderName, getProviderConfig, resolveApiKey } from "../../src/config/settings.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";

const SETTINGS_DIR = join(homedir(), ".tokens-saver-mcp");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");

function writeSettings(content: unknown) {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(content, null, 2));
}

function removeSettings() {
  if (existsSync(SETTINGS_PATH)) rmSync(SETTINGS_PATH);
}

describe("loadSettings", () => {
  afterEach(() => {
    removeSettings();
  });

  it("returns built-in defaults when settings file does not exist", () => {
    removeSettings();
    const settings = loadSettings();
    expect(settings.defaultProvider).toBe("local");
    expect(settings.providers).toHaveProperty("local");
    expect(settings.providers.local.type).toBe("openai_compatible");
  });

  it("loads a valid settings file", () => {
    writeSettings({
      defaultProvider: "remote_budget_cn",
      providers: {
        remote_budget_cn: {
          type: "openai_compatible",
          baseUrl: "https://api.example.com/v1",
          apiKeyEnv: "TEST_API_KEY",
          model: "test-model",
          timeoutMs: 10000,
          maxRetries: 1,
          temperature: 0.1,
        },
      },
      toolRouting: {
        tsm_classify: "remote_budget_cn",
      },
    });

    const settings = loadSettings();
    expect(settings.defaultProvider).toBe("remote_budget_cn");
    expect(settings.providers).toHaveProperty("remote_budget_cn");
    expect(settings.toolRouting?.tsm_classify).toBe("remote_budget_cn");
  });

  it("applies provider defaults for missing optional fields", () => {
    writeSettings({
      defaultProvider: "local",
      providers: {
        local: {
          type: "openai_compatible",
          baseUrl: "http://127.0.0.1:1234",
          apiKeyEnv: "",
          model: "my-model",
          // omit timeoutMs, maxRetries, temperature — should use defaults
        },
      },
    });

    const settings = loadSettings();
    expect(settings.providers.local.timeoutMs).toBe(20000);
    expect(settings.providers.local.maxRetries).toBe(2);
    expect(settings.providers.local.temperature).toBe(0.2);
  });

  it("throws on invalid JSON", () => {
    mkdirSync(SETTINGS_DIR, { recursive: true });
    writeFileSync(SETTINGS_PATH, "{ invalid json }");
    expect(() => loadSettings()).toThrow("not valid JSON");
  });

  it("throws on invalid schema", () => {
    writeSettings({ defaultProvider: 123 }); // wrong type
    expect(() => loadSettings()).toThrow("failed validation");
  });
});

describe("resolveProviderName", () => {
  it("returns toolRouting override when present", () => {
    const settings = loadSettings();
    // Inject a routing override
    settings.toolRouting = { tsm_classify: "special" };
    settings.defaultProvider = "default_one";
    expect(resolveProviderName(settings, "tsm_classify")).toBe("special");
  });

  it("falls back to defaultProvider when no routing", () => {
    const settings = loadSettings();
    settings.toolRouting = {};
    settings.defaultProvider = "fallback";
    expect(resolveProviderName(settings, "tsm_summarize")).toBe("fallback");
  });
});

describe("getProviderConfig", () => {
  it("throws with helpful message for missing provider", () => {
    const settings = loadSettings();
    expect(() => getProviderConfig(settings, "nonexistent")).toThrow(
      "Provider 'nonexistent' not found",
    );
  });
});

describe("resolveApiKey", () => {
  beforeEach(() => {
    removeSettings();
  });

  it("returns no-key when apiKeyEnv is empty string", () => {
    const settings = loadSettings(); // uses defaults
    const config = settings.providers.local;
    expect(resolveApiKey(config)).toBe("no-key");
  });

  it("reads key from environment variable", () => {
    process.env.TEST_SECRET_KEY = "my-secret-123";
    const config = {
      type: "openai_compatible" as const,
      baseUrl: "http://localhost",
      apiKeyEnv: "TEST_SECRET_KEY",
      model: "m",
      timeoutMs: 10000,
      maxRetries: 1,
      temperature: 0.1,
    };
    expect(resolveApiKey(config)).toBe("my-secret-123");
    delete process.env.TEST_SECRET_KEY;
  });

  it("throws when apiKeyEnv is set but env var is missing", () => {
    delete process.env.MISSING_KEY_VAR;
    const config = {
      type: "openai_compatible" as const,
      baseUrl: "http://localhost",
      apiKeyEnv: "MISSING_KEY_VAR",
      model: "m",
      timeoutMs: 10000,
      maxRetries: 1,
      temperature: 0.1,
    };
    expect(() => resolveApiKey(config)).toThrow("MISSING_KEY_VAR");
  });
});
