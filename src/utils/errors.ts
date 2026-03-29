export type GlmErrorCode =
  | "CONFIG_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_HTTP_ERROR"
  | "EMPTY_MODEL_RESPONSE"
  | "INVALID_JSON_RESPONSE"
  | "SCHEMA_VALIDATION_FAILED";

export class GlmError extends Error {
  constructor(
    public readonly code: GlmErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly suggestion: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GlmError";
  }
}

export function configError(message: string): GlmError {
  return new GlmError("CONFIG_ERROR", message, false, "Check environment variables.", undefined);
}

export function timeoutError(toolName: string, timeoutMs: number): GlmError {
  return new GlmError(
    "UPSTREAM_TIMEOUT",
    `Tool '${toolName}' timed out after ${timeoutMs}ms.`,
    true,
    "Retry or increase GLM_TIMEOUT_MS.",
    undefined,
  );
}

export function httpError(status: number, body: string): GlmError {
  const retryable = status >= 500;
  return new GlmError(
    "UPSTREAM_HTTP_ERROR",
    `Upstream returned HTTP ${status}: ${body.slice(0, 200)}`,
    retryable,
    retryable ? "Retry later." : "Check request parameters.",
    undefined,
  );
}

export function emptyResponseError(): GlmError {
  return new GlmError(
    "EMPTY_MODEL_RESPONSE",
    "Model returned an empty response.",
    true,
    "Retry or check model status.",
    undefined,
  );
}

export function invalidJsonError(raw: string, cause?: unknown): GlmError {
  return new GlmError(
    "INVALID_JSON_RESPONSE",
    `Model response is not valid JSON: ${raw.slice(0, 100)}`,
    false,
    "Check model prompt or response format.",
    cause,
  );
}

export function schemaValidationError(details: string, cause?: unknown): GlmError {
  return new GlmError(
    "SCHEMA_VALIDATION_FAILED",
    `Model output failed schema validation: ${details}`,
    false,
    "Check prompt constraints or schema definition.",
    cause,
  );
}

export function formatGlmError(err: GlmError): string {
  return JSON.stringify({
    error: err.code,
    message: err.message,
    retryable: err.retryable,
    suggestion: err.suggestion,
  });
}
