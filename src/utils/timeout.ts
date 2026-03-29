import { timeoutError } from "./errors.js";

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(toolName, timeoutMs)), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
