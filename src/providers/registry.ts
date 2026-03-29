import type { Settings, ToolName } from "../config/settings.js";
import { getProviderConfig, resolveApiKey, resolveProviderName } from "../config/settings.js";
import { providerNotFoundError } from "../utils/errors.js";
import { OpenAICompatibleProvider } from "./openaiCompatible.js";
import type { Provider } from "./types.js";

export class ProviderRegistry {
  private readonly cache = new Map<string, Provider>();

  constructor(private readonly settings: Settings) {}

  getForTool(toolName: ToolName): Provider {
    const providerName = resolveProviderName(this.settings, toolName);
    return this.getByName(providerName);
  }

  getByName(providerName: string): Provider {
    if (this.cache.has(providerName)) {
      return this.cache.get(providerName)!;
    }

    let config;
    try {
      config = getProviderConfig(this.settings, providerName);
    } catch {
      throw providerNotFoundError(providerName);
    }

    let apiKey: string;
    try {
      apiKey = resolveApiKey(config);
    } catch (err) {
      throw new Error(`Provider '${providerName}': ${String(err)}`);
    }

    const provider = new OpenAICompatibleProvider(config, apiKey);
    this.cache.set(providerName, provider);
    return provider;
  }
}
