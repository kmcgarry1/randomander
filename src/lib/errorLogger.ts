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
   * Set the current request ID for all subsequent logs
   */
  setRequestId(requestId: string): void {
    this.currentRequestId = requestId;
  }

  /**
   * Generate a new request ID
   */
  generateRequestId(): string {
    const id = generateUUID();
    this.setRequestId(id);
    return id;
  }

  /**
   * Add a breadcrumb to track the execution path
   */
  addBreadcrumb(message: string): void {
    this.breadcrumbs.push(message);
    if (this.breadcrumbs.length > 20) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Log an error with structured data
   */
  logError(
    error: AppError | Error,
    source: string,
    metadata?: Record<string, unknown>
  ): void {
    const requestId = this.currentRequestId || generateUUID();
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
   * Get all buffered log entries
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get a specific number of recent log entries
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.buffer.slice(0, count);
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Export logs as JSON string
   */
  exportLogsAsJson(): string {
    return JSON.stringify(this.buffer, null, 2);
  }

  /**
   * Export logs as CSV (simple format)
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
   * Reset the logger to initial state
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
 * Get or create the global error logger instance
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
 * Reset the global logger instance
 */
export function resetGlobalErrorLogger(): void {
  globalLogger = null;
}
