import OpenAI from "openai";
import type { Config } from "../config.js";
import {
  GlmError,
  emptyResponseError,
  httpError,
  schemaValidationError,
} from "../utils/errors.js";
import { safeParseJson } from "../utils/json.js";
import { logCall } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import type { ZodType } from "zod";

export interface GlmCallOptions {
  toolName: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GlmJsonCallOptions<T> extends GlmCallOptions {
  outputSchema: ZodType<T>;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof GlmError) return err.retryable;
  return false;
}

export class GlmClient {
  private readonly openai: OpenAI;

  constructor(private readonly config: Config) {
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey || "no-key",
    });
  }

  async callText(options: GlmCallOptions): Promise<string> {
    const {
      toolName,
      systemPrompt,
      userPrompt,
      maxOutputTokens = 512,
      temperature = this.config.temperature,
      timeoutMs = this.config.timeoutMs,
    } = options;

    const inputChars = systemPrompt.length + userPrompt.length;
    const start = Date.now();
    let retried = false;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) retried = true;

      try {
        const result = await withTimeout(
          this.doTextRequest(systemPrompt, userPrompt, maxOutputTokens, temperature),
          timeoutMs,
          toolName,
        );

        logCall({
          tool: toolName,
          durationMs: Date.now() - start,
          inputChars,
          outputChars: result.length,
          retried,
        });

        return result;
      } catch (err) {
        lastError = err;
        if (!isRetryableError(err)) break;
      }
    }

    const errCode = lastError instanceof GlmError ? lastError.code : "UNKNOWN";
    logCall({
      tool: toolName,
      durationMs: Date.now() - start,
      inputChars,
      outputChars: 0,
      retried,
      errorCode: errCode,
    });
    throw lastError;
  }

  async callJson<T>(options: GlmJsonCallOptions<T>): Promise<T> {
    const raw = await this.callText({
      ...options,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    });

    const parseResult = safeParseJson<unknown>(raw);
    if (!parseResult.ok) throw parseResult.error;

    const zodResult = options.outputSchema.safeParse(parseResult.value);
    if (!zodResult.success) {
      throw schemaValidationError(zodResult.error.message, zodResult.error);
    }

    return zodResult.data;
  }

  private async doTextRequest(
    systemPrompt: string,
    userPrompt: string,
    maxOutputTokens: number,
    temperature: number,
  ): Promise<string> {
    let response: OpenAI.Chat.ChatCompletion;
    try {
      response = await this.openai.chat.completions.create({
        model: this.config.model,
        max_tokens: maxOutputTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (err: unknown) {
      if (err instanceof OpenAI.APIError) {
        throw httpError(err.status ?? 500, err.message);
      }
      throw err;
    }

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === "") {
      throw emptyResponseError();
    }
    return content.trim();
  }
}
