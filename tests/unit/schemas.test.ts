import { describe, it, expect } from "vitest";
import { ClassifyInputSchema, ClassifyOutputSchema } from "../../src/schemas/classify.js";
import { ExtractJsonInputSchema, ExtractJsonOutputSchema } from "../../src/schemas/extractJson.js";
import { SummarizeInputSchema } from "../../src/schemas/summarize.js";
import { RewriteInputSchema } from "../../src/schemas/rewrite.js";
import { CodegenInputSchema } from "../../src/schemas/codegen.js";
import { DiffDigestInputSchema } from "../../src/schemas/diffDigest.js";
import { TaskExtractInputSchema, TaskExtractOutputSchema } from "../../src/schemas/taskExtract.js";

describe("ClassifyInputSchema", () => {
  it("accepts valid input", () => {
    const result = ClassifyInputSchema.safeParse({
      text: "Hello world",
      labels: ["positive", "negative"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects input with fewer than 2 labels", () => {
    const result = ClassifyInputSchema.safeParse({ text: "Hello", labels: ["only"] });
    expect(result.success).toBe(false);
  });

  it("rejects missing text", () => {
    const result = ClassifyInputSchema.safeParse({ labels: ["a", "b"] });
    expect(result.success).toBe(false);
  });
});

describe("ClassifyOutputSchema", () => {
  it("accepts valid output", () => {
    const result = ClassifyOutputSchema.safeParse({
      label: "positive",
      confidence: 0.9,
      reason: "The text is positive.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence out of range", () => {
    const result = ClassifyOutputSchema.safeParse({
      label: "positive",
      confidence: 1.5,
      reason: "ok",
    });
    expect(result.success).toBe(false);
  });
});

describe("ExtractJsonInputSchema", () => {
  it("accepts valid input", () => {
    const result = ExtractJsonInputSchema.safeParse({
      text: "Invoice #123 dated 2024-01-01",
      schema_description: "invoice_number, date",
      extraction_goal: "Extract invoice metadata",
    });
    expect(result.success).toBe(true);
  });
});

describe("ExtractJsonOutputSchema", () => {
  it("accepts valid output with missing fields", () => {
    const result = ExtractJsonOutputSchema.safeParse({
      data: { invoice_number: "123" },
      missing_fields: ["date"],
    });
    expect(result.success).toBe(true);
  });
});

describe("SummarizeInputSchema", () => {
  it("accepts valid input", () => {
    const result = SummarizeInputSchema.safeParse({ text: "Long text...", summary_style: "brief" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid style", () => {
    const result = SummarizeInputSchema.safeParse({ text: "text", summary_style: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("RewriteInputSchema", () => {
  it("accepts translation styles", () => {
    expect(
      RewriteInputSchema.safeParse({ text: "Hello", style: "cn_en_translation" }).success,
    ).toBe(true);
    expect(
      RewriteInputSchema.safeParse({ text: "你好", style: "en_cn_translation" }).success,
    ).toBe(true);
  });

  it("rejects unknown style", () => {
    expect(RewriteInputSchema.safeParse({ text: "text", style: "poetic" }).success).toBe(false);
  });
});

describe("CodegenInputSchema", () => {
  it("accepts minimal input", () => {
    const result = CodegenInputSchema.safeParse({ task: "Write a function to parse ISO dates" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = CodegenInputSchema.safeParse({
      task: "Add null check",
      language: "TypeScript",
      existing_code: "function foo() {}",
      constraints: "No side effects",
    });
    expect(result.success).toBe(true);
  });
});

describe("DiffDigestInputSchema", () => {
  it("accepts diff without focus", () => {
    const result = DiffDigestInputSchema.safeParse({ diff_text: "diff --git a/file.ts..." });
    expect(result.success).toBe(true);
  });

  it("accepts diff with focus", () => {
    const result = DiffDigestInputSchema.safeParse({
      diff_text: "diff...",
      focus: "risk",
    });
    expect(result.success).toBe(true);
  });
});

describe("TaskExtractInputSchema", () => {
  it("accepts valid granularity", () => {
    expect(
      TaskExtractInputSchema.safeParse({ text: "Review PR", task_granularity: "fine" }).success,
    ).toBe(true);
  });

  it("rejects invalid granularity", () => {
    expect(
      TaskExtractInputSchema.safeParse({ text: "text", task_granularity: "micro" }).success,
    ).toBe(false);
  });
});

describe("TaskExtractOutputSchema", () => {
  it("accepts valid task list", () => {
    const result = TaskExtractOutputSchema.safeParse({
      tasks: [
        { title: "Write unit tests", owner: "Alice", due: "2024-12-01", status: "todo", notes: null },
        { title: "Deploy to staging", owner: null, due: null, status: "doing", notes: "blocked on CI" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = TaskExtractOutputSchema.safeParse({
      tasks: [{ title: "Do something", status: "invalid" }],
    });
    expect(result.success).toBe(false);
  });
});
