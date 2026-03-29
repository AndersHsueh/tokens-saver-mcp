export interface LogEntry {
  tool: string;
  durationMs: number;
  inputChars: number;
  outputChars: number;
  retried: boolean;
  errorCode?: string;
}

export function logCall(entry: LogEntry): void {
  const parts = [
    `[glm] tool=${entry.tool}`,
    `duration=${entry.durationMs}ms`,
    `in=${entry.inputChars}chars`,
    `out=${entry.outputChars}chars`,
    `retried=${entry.retried}`,
  ];
  if (entry.errorCode) parts.push(`error=${entry.errorCode}`);
  process.stderr.write(parts.join(" ") + "\n");
}
