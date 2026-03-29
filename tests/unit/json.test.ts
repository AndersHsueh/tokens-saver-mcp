import { describe, it, expect } from "vitest";
import { safeParseJson } from "../../src/utils/json.js";

describe("safeParseJson", () => {
  it("parses valid JSON", () => {
    const result = safeParseJson<{ a: number }>('{"a": 1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ a: 1 });
  });

  it("strips markdown code fences before parsing", () => {
    const result = safeParseJson<{ x: string }>("```json\n{\"x\": \"hello\"}\n```");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ x: "hello" });
  });

  it("strips plain code fences", () => {
    const result = safeParseJson<{ y: number }>("```\n{\"y\": 42}\n```");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ y: 42 });
  });

  it("returns error for invalid JSON", () => {
    const result = safeParseJson("not-json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_JSON_RESPONSE");
  });
});
