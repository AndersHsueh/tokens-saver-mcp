import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("returns defaults when env vars are not set", () => {
    const originalEnv = { ...process.env };
    delete process.env.ZAI_BASE_URL;
    delete process.env.ZAI_MODEL;
    delete process.env.ZAI_API_KEY;
    delete process.env.GLM_TIMEOUT_MS;
    delete process.env.GLM_MAX_RETRIES;
    delete process.env.GLM_TEMPERATURE;

    const config = loadConfig();

    expect(config.baseUrl).toBe("http://127.0.0.1:1234");
    expect(config.model).toBe("zai-org/glm-4.7-flash");
    expect(config.timeoutMs).toBe(20000);
    expect(config.maxRetries).toBe(2);
    expect(config.temperature).toBe(0.2);

    Object.assign(process.env, originalEnv);
  });

  it("reads custom values from env vars", () => {
    process.env.ZAI_BASE_URL = "http://localhost:8080";
    process.env.ZAI_MODEL = "custom-model";
    process.env.GLM_TIMEOUT_MS = "5000";
    process.env.GLM_MAX_RETRIES = "3";
    process.env.GLM_TEMPERATURE = "0.5";

    const config = loadConfig();

    expect(config.baseUrl).toBe("http://localhost:8080");
    expect(config.model).toBe("custom-model");
    expect(config.timeoutMs).toBe(5000);
    expect(config.maxRetries).toBe(3);
    expect(config.temperature).toBe(0.5);

    delete process.env.ZAI_BASE_URL;
    delete process.env.ZAI_MODEL;
    delete process.env.GLM_TIMEOUT_MS;
    delete process.env.GLM_MAX_RETRIES;
    delete process.env.GLM_TEMPERATURE;
  });

  it("falls back to defaults for invalid integer env vars", () => {
    process.env.GLM_TIMEOUT_MS = "not-a-number";
    const config = loadConfig();
    expect(config.timeoutMs).toBe(20000);
    delete process.env.GLM_TIMEOUT_MS;
  });
});
