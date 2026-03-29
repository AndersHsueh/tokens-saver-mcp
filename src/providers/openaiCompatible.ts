import OpenAI from "openai";
import type { ProviderConfig } from "../config/settings.js";
import type { Provider, TextCallOptions, JsonCallOptions } from "./types.js";
import {
  GlmError,
  emptyResponseError,
  httpError,
  schemaValidationError,
} from "../utils/errors.js";
import { safeParseJson } from "../utils/json.js";
import { logCall } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";

function isRetryableError(err: unknown): boolean {
  if (err instanceof GlmError) return err.retryable;
  return false;
}

export class OpenAICompatibleProvider implements Provider {
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ProviderConfig,
    private readonly apiKey: string,
  ) {
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: apiKey || "no-key",
    });
  }

  async generateText(options: TextCallOptions): Promise<string> {
    const {
      toolName,
      systemPrompt,
      userPrompt,
      maxOutputTokens = 512,
      temperature = this.config.temperature,
    } = options;

    const timeoutMs = this.config.timeoutMs;
    const inputChars = systemPrompt.length + userPrompt.length;
    const start = Date.now();
    let retried = false;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) retried = true;
      try {
        const result = await withTimeout(
          this.doRequest(systemPrompt, userPrompt, maxOutputTokens, temperature),
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

  async generateJson<T>(options: JsonCallOptions<T>): Promise<T> {
    const raw = await this.generateText({
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

  private async doRequest(
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
