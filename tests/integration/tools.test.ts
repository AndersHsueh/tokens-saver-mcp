import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Provider } from "../../src/providers/types.js";
import { runClassify } from "../../src/tools/classify.js";
import { runExtractJson } from "../../src/tools/extractJson.js";
import { runSummarize } from "../../src/tools/summarize.js";
import { runRewrite } from "../../src/tools/rewrite.js";
import { runCodegen } from "../../src/tools/codegen.js";
import { runDiffDigest } from "../../src/tools/diffDigest.js";
import { runTaskExtract } from "../../src/tools/taskExtract.js";
import { GlmError, httpError, timeoutError, invalidJsonError } from "../../src/utils/errors.js";

function makeMockProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    generateText: vi.fn(),
    generateJson: vi.fn(),
    ...overrides,
  };
}

// ─── tsm_classify ─────────────────────────────────────────────────────────────
describe("runClassify", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns content and structuredContent for valid input", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      label: "bug",
      confidence: 0.92,
      reason: "The text describes an error.",
    });

    const result = await runClassify(provider, {
      text: "The app crashes on startup",
      labels: ["bug", "feature", "question"],
    });

    expect(result.structuredContent.label).toBe("bug");
    expect(result.structuredContent.confidence).toBeCloseTo(0.92);
    expect(result.content).toContain("bug");
  });

  it("throws on invalid input schema", async () => {
    await expect(runClassify(provider, { text: "hello" })).rejects.toThrow("Invalid input");
  });

  it("throws when model returns label not in provided list", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      label: "unknown-label",
      confidence: 0.5,
      reason: "Not sure.",
    });

    await expect(
      runClassify(provider, { text: "some text", labels: ["bug", "feature"] }),
    ).rejects.toThrow("not in provided labels list");
  });

  it("wraps GlmError as plain Error", async () => {
    vi.mocked(provider.generateJson).mockRejectedValueOnce(timeoutError("tsm_classify", 20000));
    await expect(
      runClassify(provider, { text: "text", labels: ["a", "b"] }),
    ).rejects.toThrow("UPSTREAM_TIMEOUT");
  });
});

// ─── tsm_extract_json ─────────────────────────────────────────────────────────
describe("runExtractJson", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns extracted fields and missing list", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      data: { invoice_number: "INV-001", amount: 500 },
      missing_fields: ["due_date"],
    });

    const result = await runExtractJson(provider, {
      text: "Invoice INV-001 for $500",
      schema_description: "invoice_number, amount, due_date",
      extraction_goal: "Extract invoice metadata",
    });

    expect(result.structuredContent.data).toHaveProperty("invoice_number", "INV-001");
    expect(result.structuredContent.missing_fields).toContain("due_date");
    expect(result.content).toContain("2 field");
  });

  it("throws on invalid input", async () => {
    await expect(runExtractJson(provider, {})).rejects.toThrow("Invalid input");
  });

  it("wraps upstream HTTP error", async () => {
    vi.mocked(provider.generateJson).mockRejectedValueOnce(httpError(503, "Service Unavailable"));
    await expect(
      runExtractJson(provider, {
        text: "text",
        schema_description: "fields",
        extraction_goal: "extract",
      }),
    ).rejects.toThrow("UPSTREAM_HTTP_ERROR");
  });
});

// ─── tsm_summarize ────────────────────────────────────────────────────────────
describe("runSummarize", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns summary, bullets, and risks", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      summary: "The meeting covered Q3 goals.",
      bullets: ["Launch new feature", "Hire two engineers"],
      risks: ["Budget constraint"],
    });

    const result = await runSummarize(provider, {
      text: "Long meeting notes...",
      summary_style: "bullet",
    });

    expect(result.structuredContent.bullets).toHaveLength(2);
    expect(result.content).toContain("Summary:");
  });

  it("throws on invalid style", async () => {
    await expect(
      runSummarize(provider, { text: "text", summary_style: "detailed" }),
    ).rejects.toThrow("Invalid input");
  });
});

// ─── tsm_rewrite ──────────────────────────────────────────────────────────────
describe("runRewrite", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns rewritten text", async () => {
    vi.mocked(provider.generateText).mockResolvedValueOnce(
      "The system failed due to a network issue.",
    );

    const result = await runRewrite(provider, {
      text: "The thing broke because of network stuff",
      style: "formal",
    });

    expect(result.structuredContent.rewritten_text).toBe(
      "The system failed due to a network issue.",
    );
    expect(result.content).toContain("formal");
  });

  it("throws on invalid style", async () => {
    await expect(
      runRewrite(provider, { text: "text", style: "poetic" }),
    ).rejects.toThrow("Invalid input");
  });
});

// ─── tsm_codegen_small_patch ──────────────────────────────────────────────────
describe("runCodegen", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns code, explanation, and risk_notes", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      code: "const parseDate = (s: string) => new Date(s);",
      explanation: "Uses the built-in Date constructor.",
      risk_notes: ["Does not validate timezone"],
    });

    const result = await runCodegen(provider, {
      task: "Write a date parser",
      language: "TypeScript",
    });

    expect(result.structuredContent.code).toContain("parseDate");
    expect(result.structuredContent.risk_notes).toHaveLength(1);
  });

  it("throws on empty task", async () => {
    await expect(runCodegen(provider, { task: "" })).rejects.toThrow("Invalid input");
  });
});

// ─── tsm_diff_digest ──────────────────────────────────────────────────────────
describe("runDiffDigest", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns structured diff digest", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      changed_areas: ["src/auth.ts"],
      behavior_changes: ["Login now requires 2FA"],
      risks: ["Existing sessions may be invalidated"],
      one_paragraph_summary: "Added 2FA to the login flow.",
    });

    const result = await runDiffDigest(provider, {
      diff_text: "diff --git a/src/auth.ts ...",
      focus: "behavior",
    });

    expect(result.structuredContent.changed_areas).toContain("src/auth.ts");
    expect(result.content).toContain("Changed areas:");
  });

  it("wraps JSON parse error", async () => {
    vi.mocked(provider.generateJson).mockRejectedValueOnce(invalidJsonError("not json"));
    await expect(
      runDiffDigest(provider, { diff_text: "diff..." }),
    ).rejects.toThrow("INVALID_JSON_RESPONSE");
  });
});

// ─── tsm_task_extract ─────────────────────────────────────────────────────────
describe("runTaskExtract", () => {
  let provider: Provider;

  beforeEach(() => {
    provider = makeMockProvider();
  });

  it("returns task list", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({
      tasks: [
        { title: "Write unit tests", owner: "Alice", due: null, status: "todo", notes: null },
        { title: "Deploy to staging", owner: null, due: "2024-12-15", status: "doing", notes: null },
      ],
    });

    const result = await runTaskExtract(provider, {
      text: "Alice needs to write unit tests. We should deploy to staging by Dec 15.",
      task_granularity: "normal",
    });

    expect(result.structuredContent.tasks).toHaveLength(2);
    expect(result.content).toContain("2 task");
  });

  it("handles empty task list", async () => {
    vi.mocked(provider.generateJson).mockResolvedValueOnce({ tasks: [] });

    const result = await runTaskExtract(provider, {
      text: "Nothing to do.",
      task_granularity: "coarse",
    });

    expect(result.structuredContent.tasks).toHaveLength(0);
    expect(result.content).toContain("0 task");
  });

  it("throws on invalid granularity", async () => {
    await expect(
      runTaskExtract(provider, { text: "text", task_granularity: "ultra" }),
    ).rejects.toThrow("Invalid input");
  });
});
