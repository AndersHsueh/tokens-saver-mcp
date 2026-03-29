import { invalidJsonError } from "./errors.js";
import type { GlmError } from "./errors.js";

export type JsonParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: GlmError };

export function safeParseJson<T = unknown>(raw: string): JsonParseResult<T> {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return { ok: true, value: JSON.parse(cleaned) as T };
  } catch (err) {
    return { ok: false, error: invalidJsonError(raw, err) };
  }
}
