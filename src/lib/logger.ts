/**
 * Sentry integration - lazy load to avoid issues when Sentry is not configured
 */
let Sentry: typeof import("@sentry/nextjs") | null = null;
try {
  // Only import in server/edge runtime (where Sentry is available)
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require("@sentry/nextjs");
  }
} catch {
  // Sentry not available or not configured (e.g., missing DSN)
  Sentry = null;
}

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
 * - Sentry integration for error tracking (server-side only)
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

    // Send ERROR level logs to Sentry (server-side only)
    if (Sentry && typeof window === "undefined") {
      Sentry.captureMessage(message, {
        level: "error",
        tags: context as Record<string, string> | undefined,
        extra: context,
      });
    }
  } else if (level === "WARN") {
    console.warn(line);

    // Optionally send WARN to Sentry (but with warning level)
    if (Sentry && typeof window === "undefined") {
      Sentry.captureMessage(message, {
        level: "warning",
        tags: context as Record<string, string> | undefined,
        extra: context,
      });
    }
  } else {
    console.info(line);
  }
}

/**
 * Capture an exception/error to Sentry.
 * Use this for caught exceptions that should be tracked.
 *
 * @param error - The error/exception to capture
 * @param context - Additional context (requestId, userId, etc.)
 */
export function captureException(error: Error, context?: LogContext) {
  if (Sentry && typeof window === "undefined") {
    Sentry.captureException(error, {
      tags: context as Record<string, string> | undefined,
      extra: context,
    });
  }

  // Also log via standard logger
  logger.error(`Exception: ${error.message}`, {
    ...context,
    stack: error.stack,
    name: error.name,
  });
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
   * Errors are automatically sent to Sentry (if configured).
   */
  error(message: string, context?: LogContext) {
    log("ERROR", message, context);
  },
};


