import { AppError } from './appError';

/**
 * Generate a UUID v4 string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface LogEntry {
  timestamp: string;
  requestId: string;
  errorType: string;
  code: string;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
  breadcrumbs: string[];
  stackTrace?: string;
}

export interface ErrorLoggerOptions {
  maxBufferSize?: number;
  enableConsoleLogging?: boolean;
  enableBufferLogging?: boolean;
}

/**
 * Logs errors to the console and an optional bounded, in-memory buffer.
 * Entries are newest first; buffer and breadcrumbs are lost on reload.
 */
export class ErrorLogger {
  private buffer: LogEntry[] = [];
  private maxBufferSize: number;
  private enableConsoleLogging: boolean;
  private enableBufferLogging: boolean;
  private breadcrumbs: string[] = [];
  private currentRequestId: string | null = null;

  constructor(options: ErrorLoggerOptions = {}) {
    this.maxBufferSize = options.maxBufferSize ?? 50;
    this.enableConsoleLogging = options.enableConsoleLogging ?? true;
    this.enableBufferLogging = options.enableBufferLogging ?? true;
  }

  /**
   * Set the shared request ID used by subsequent logs until reset or replaced.
   */
  setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
  }

  /**
   * Generate and set a request ID for subsequent logs.
   */
  generateRequestId(): string {
    const id = generateUUID();
    this.setRequestId(id);
    return id;
  }

  /**
   * Add a breadcrumb, retaining the most recent 20 messages.
   */
  addBreadcrumb(message: string): void {
    this.breadcrumbs.push(message);
    if (this.breadcrumbs.length > 20) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Log an error using its request ID, the current ID, or a newly generated ID.
   * Supplied metadata overrides matching fields from an AppError.
   */
  logError(
    error: AppError | Error,
    source: string,
    metadata?: Record<string, unknown>
  ): void {
    const requestId =
      (error instanceof AppError && error.requestId) ||
      this.currentRequestId ||
      generateUUID();
    const timestamp = new Date().toISOString();

    let errorType: string;
    let code: string;
    let message: string;
    let errorMetadata: Record<string, unknown> | undefined;

    if (error instanceof AppError) {
      errorType = error.type;
      code = error.code;
      message = error.message;
      errorMetadata = error.metadata;
    } else {
      errorType = 'UnknownError';
      code = 'unknown';
      message = error.message || 'Unknown error occurred';
    }

    const entry: LogEntry = {
      timestamp,
      requestId,
      errorType,
      code,
      message,
      source,
      metadata: { ...errorMetadata, ...metadata },
      breadcrumbs: [...this.breadcrumbs],
      stackTrace: error instanceof Error ? error.stack : undefined,
    };

    if (this.enableConsoleLogging) {
      console.error('[ErrorLogger]', JSON.stringify(entry, null, 2));
    }

    if (this.enableBufferLogging) {
      this.buffer.unshift(entry);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.pop();
      }
    }
  }

  /**
   * Get a shallow copy of buffered entries, newest first.
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get up to `count` buffered entries, newest first.
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.buffer.slice(0, count);
  }

  /**
   * Clear the log buffer without clearing breadcrumbs or the request ID.
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Clear breadcrumbs without clearing buffered entries.
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Serialize the current buffer as a formatted JSON string.
   */
  exportLogsAsJson(): string {
    return JSON.stringify(this.buffer, null, 2);
  }

  /**
   * Export selected log fields as CSV, including escaped message quotes.
   */
  exportLogsAsCsv(): string {
    const headers = [
      'timestamp',
      'requestId',
      'errorType',
      'code',
      'message',
      'source',
    ];
    const rows = this.buffer.map((entry) => [
      entry.timestamp,
      entry.requestId,
      entry.errorType,
      entry.code,
      `"${entry.message.replace(/"/g, '""')}"`,
      entry.source,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  /**
   * Clear the buffer, breadcrumbs and current request ID.
   */
  reset(): void {
    this.clearBuffer();
    this.clearBreadcrumbs();
    this.currentRequestId = null;
  }
}

// Global logger instance
let globalLogger: ErrorLogger | null = null;

/**
 * Get or create the global logger. Options apply only when it is first created.
 */
export function getGlobalErrorLogger(
  options?: ErrorLoggerOptions
): ErrorLogger {
  if (!globalLogger) {
    globalLogger = new ErrorLogger(options);
  }
  return globalLogger;
}

/**
 * Discard the global logger so the next lookup creates a new instance.
 */
export function resetGlobalErrorLogger(): void {
  globalLogger = null;
}
