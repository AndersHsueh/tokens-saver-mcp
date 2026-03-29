import { describe, it, expect } from "vitest";
import {
  GlmError,
  configError,
  timeoutError,
  httpError,
  emptyResponseError,
  invalidJsonError,
  schemaValidationError,
  formatGlmError,
} from "../../src/utils/errors.js";

describe("error factories", () => {
  it("configError is not retryable", () => {
    const err = configError("Missing API key");
    expect(err).toBeInstanceOf(GlmError);
    expect(err.code).toBe("CONFIG_ERROR");
    expect(err.retryable).toBe(false);
  });

  it("timeoutError is retryable", () => {
    const err = timeoutError("local_classify", 20000);
    expect(err.code).toBe("UPSTREAM_TIMEOUT");
    expect(err.retryable).toBe(true);
  });

  it("httpError 500 is retryable", () => {
    const err = httpError(500, "Internal Server Error");
    expect(err.code).toBe("UPSTREAM_HTTP_ERROR");
    expect(err.retryable).toBe(true);
  });

  it("httpError 400 is not retryable", () => {
    const err = httpError(400, "Bad Request");
    expect(err.retryable).toBe(false);
  });

  it("emptyResponseError is retryable", () => {
    const err = emptyResponseError();
    expect(err.code).toBe("EMPTY_MODEL_RESPONSE");
    expect(err.retryable).toBe(true);
  });

  it("invalidJsonError is not retryable", () => {
    const err = invalidJsonError("bad json");
    expect(err.code).toBe("INVALID_JSON_RESPONSE");
    expect(err.retryable).toBe(false);
  });

  it("schemaValidationError is not retryable", () => {
    const err = schemaValidationError("field missing");
    expect(err.code).toBe("SCHEMA_VALIDATION_FAILED");
    expect(err.retryable).toBe(false);
  });

  it("formatGlmError produces parseable JSON", () => {
    const err = timeoutError("tool", 5000);
    const formatted = formatGlmError(err);
    const parsed = JSON.parse(formatted) as Record<string, unknown>;
    expect(parsed.error).toBe("UPSTREAM_TIMEOUT");
    expect(typeof parsed.message).toBe("string");
    expect(typeof parsed.retryable).toBe("boolean");
    expect(typeof parsed.suggestion).toBe("string");
  });
});
