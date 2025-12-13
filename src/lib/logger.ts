export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogContext = Record<string, unknown>;

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "Non-serializable log context" });
  }
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  const line = safeStringify(entry);

  if (level === "ERROR") console.error(line);
  else if (level === "WARN") console.warn(line);
  else console.info(line);
}

export const logger = {
  info(message: string, context?: LogContext) {
    log("INFO", message, context);
  },
  warn(message: string, context?: LogContext) {
    log("WARN", message, context);
  },
  error(message: string, context?: LogContext) {
    log("ERROR", message, context);
  },
};


