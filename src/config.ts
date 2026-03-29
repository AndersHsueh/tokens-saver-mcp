export interface Config {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
  temperature: number;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): Config {
  return {
    baseUrl: getEnv("ZAI_BASE_URL", "http://127.0.0.1:1234"),
    model: getEnv("ZAI_MODEL", "zai-org/glm-4.7-flash"),
    apiKey: getEnv("ZAI_API_KEY", "no-key"),
    timeoutMs: getEnvInt("GLM_TIMEOUT_MS", 20000),
    maxRetries: getEnvInt("GLM_MAX_RETRIES", 2),
    temperature: getEnvFloat("GLM_TEMPERATURE", 0.2),
  };
}
