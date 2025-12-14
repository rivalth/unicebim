export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogContext = Record<string, unknown>;

/**
 * Standardized logging utility for UniCebim.
 *
 * Features:
 * - Structured JSON logging (production-ready)
 * - Request ID correlation support
 * - Safe serialization (handles circular references)
 * - Environment-aware output (stderr for errors, stdout for info)
 *
 * Usage:
 * ```ts
 * logger.info("User logged in", { userId: user.id, requestId });
 * logger.error("Database query failed", { requestId, code: error.code, message: error.message });
 * ```
 */
function safeStringify(value: unknown): string {
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

  // Use appropriate console method for log level
  // Production platforms (Vercel, etc.) will route these appropriately
  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  /**
   * Log an informational message.
   * Use for normal operation events (e.g., "User logged in", "Transaction created").
   */
  info(message: string, context?: LogContext) {
    log("INFO", message, context);
  },

  /**
   * Log a warning message.
   * Use for recoverable issues or deprecation notices (e.g., "Fallback query used", "Missing RPC function").
   */
  warn(message: string, context?: LogContext) {
    log("WARN", message, context);
  },

  /**
   * Log an error message.
   * Use for failures that require attention (e.g., "Database query failed", "Authentication error").
   * Always include `requestId` in context for correlation.
   */
  error(message: string, context?: LogContext) {
    log("ERROR", message, context);
  },
};


