import type { ZodType } from "zod";

export interface TextCallOptions {
  toolName: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface JsonCallOptions<T> extends TextCallOptions {
  outputSchema: ZodType<T>;
}

/** Unified provider interface. All providers must implement these two methods. */
export interface Provider {
  generateText(options: TextCallOptions): Promise<string>;
  generateJson<T>(options: JsonCallOptions<T>): Promise<T>;
}
