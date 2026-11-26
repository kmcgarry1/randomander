import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorLogger,
  getGlobalErrorLogger,
  resetGlobalErrorLogger,
} from '../../lib/errorLogger';
import {
  NetworkError,
  ValidationError,
  StorageError,
  CacheError,
} from '../../lib/appError';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger({ enableConsoleLogging: false });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create logger with default options', () => {
      const newLogger = new ErrorLogger();
      expect(newLogger).toBeDefined();
    });

    it('should create logger with custom buffer size', () => {
      const customLogger = new ErrorLogger({ maxBufferSize: 25 });
      expect(customLogger).toBeDefined();
    });

    it('should respect enableConsoleLogging option', () => {
      const loggerWithConsole = new ErrorLogger({
        enableConsoleLogging: true,
      });
      const networkError = new NetworkError('Connection failed', 'timeout', {
        url: 'http://test.com',
      });

      loggerWithConsole.logError(networkError, 'test-source');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('request ID management', () => {
    it('should set and use custom request ID', () => {
      const customId = 'custom-request-123';
      logger.setRequestId(customId);
      const networkError = new NetworkError('Failed', 'timeout');

      logger.logError(networkError, 'test-source');
      const logs = logger.getBuffer();

      expect(logs[0].requestId).toBe(customId);
    });

    it('should generate unique request IDs', () => {
      const id1 = logger.generateRequestId();
      const id2 = logger.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should use generated request ID in logs', () => {
      const id = logger.generateRequestId();
      const networkError = new NetworkError('timeout', 'Failed');

      logger.logError(networkError, 'test-source');
      const logs = logger.getBuffer();

      expect(logs[0].requestId).toBe(id);
    });

    it('should maintain current request ID across multiple logs', () => {
      const id = logger.generateRequestId();

      logger.logError(new NetworkError('timeout', 'Error 1'), 'source-1');
      logger.logError(new ValidationError('schema-mismatch', 'Error 2'), 'source-2');

      const logs = logger.getBuffer();

      expect(logs[0].requestId).toBe(id);
      expect(logs[1].requestId).toBe(id);
    });
  });

  describe('breadcrumb tracking', () => {
    it('should add breadcrumbs', () => {
      logger.addBreadcrumb('step 1');
      logger.addBreadcrumb('step 2');

      const error = new NetworkError('Failed', 'timeout');
      logger.logError(error, 'test-source');

      const logs = logger.getBuffer();
      expect(logs[0].breadcrumbs).toContain('step 1');
      expect(logs[0].breadcrumbs).toContain('step 2');
    });

    it('should limit breadcrumb history to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        logger.addBreadcrumb(`step ${i}`);
      }

      const error = new NetworkError('Failed', 'timeout');
      logger.logError(error, 'test-source');

      const logs = logger.getBuffer();
      expect(logs[0].breadcrumbs.length).toBe(20);
      expect(logs[0].breadcrumbs[0]).toBe('step 5');
      expect(logs[0].breadcrumbs[19]).toBe('step 24');
    });

    it('should clear breadcrumbs', () => {
      logger.addBreadcrumb('step 1');
      logger.clearBreadcrumbs();

      const error = new NetworkError('Failed', 'timeout');
      logger.logError(error, 'test-source');

      const logs = logger.getBuffer();
      expect(logs[0].breadcrumbs.length).toBe(0);
    });
  });

  describe('error logging', () => {
    it('should log AppError with correct type and code', () => {
      const error = new NetworkError('timeout', 'Connection timeout', {
        metadata: {
          url: 'http://api.test.com',
          retryCount: 3,
        },
      });

      logger.logError(error, 'scryfall-service');

      const logs = logger.getBuffer();
      expect(logs[0].errorType).toBe('network');
      expect(logs[0].code).toBe('timeout');
      expect(logs[0].message).toBe('Connection timeout');
      expect(logs[0].source).toBe('scryfall-service');
    });

    it('should capture error metadata', () => {
      const error = new ValidationError('schema-mismatch', 'Invalid response', {
        metadata: {
          field: 'name',
          expectedType: 'string',
        },
      });

      logger.logError(error, 'validation-service', {
        attemptNumber: 2,
      });

      const logs = logger.getBuffer();
      const metadata = logs[0].metadata;

      expect(metadata?.field).toBe('name');
      expect(metadata?.expectedType).toBe('string');
      expect(metadata?.attemptNumber).toBe(2);
    });

    it('should log regular Error objects', () => {
      const regularError = new Error('Something went wrong');
      logger.logError(regularError, 'unknown-source');

      const logs = logger.getBuffer();
      expect(logs[0].errorType).toBe('UnknownError');
      expect(logs[0].code).toBe('unknown');
      expect(logs[0].message).toBe('Something went wrong');
    });

    it('should capture stack trace', () => {
      const error = new Error('Test error');
      logger.logError(error, 'test-source');

      const logs = logger.getBuffer();
      expect(logs[0].stackTrace).toBeDefined();
      expect(logs[0].stackTrace).toContain('Error: Test error');
    });

    it('should include timestamp in ISO format', () => {
      logger.logError(new NetworkError('timeout', 'Failed'), 'test-source');

      const logs = logger.getBuffer();
      const timestamp = logs[0].timestamp;

      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should log all error types', () => {
      const errors = [
        new NetworkError('timeout', 'Net error'),
        new ValidationError('schema-mismatch', 'Val error'),
        new StorageError('quota-exceeded', 'Storage error'),
        new CacheError('corrupted', 'Cache error'),
      ];

      errors.forEach((error, index) => {
        logger.logError(error, `source-${index}`);
      });

      const logs = logger.getBuffer();
      expect(logs.length).toBe(4);
      expect(logs[3].errorType).toBe('network');
      expect(logs[2].errorType).toBe('validation');
      expect(logs[1].errorType).toBe('storage');
      expect(logs[0].errorType).toBe('cache');
    });
  });

  describe('buffer management', () => {
    it('should maintain buffer in FIFO order (most recent first)', () => {
      logger.logError(new NetworkError('timeout', 'Error 1'), 'source-1');
      logger.logError(new NetworkError('timeout', 'Error 2'), 'source-2');
      logger.logError(new NetworkError('timeout', 'Error 3'), 'source-3');

      const logs = logger.getBuffer();
      expect(logs[0].source).toBe('source-3');
      expect(logs[1].source).toBe('source-2');
      expect(logs[2].source).toBe('source-1');
    });

    it('should respect max buffer size', () => {
      const smallLogger = new ErrorLogger({
        maxBufferSize: 5,
        enableConsoleLogging: false,
      });

      for (let i = 0; i < 10; i++) {
        smallLogger.logError(
          new NetworkError('timeout', `Error ${i}`),
          `source-${i}`
        );
      }

      const logs = smallLogger.getBuffer();
      expect(logs.length).toBe(5);
      expect(logs[0].source).toBe('source-9');
      expect(logs[4].source).toBe('source-5');
    });

    it('should clear buffer', () => {
      logger.logError(new NetworkError('timeout', 'Error'), 'source');
      expect(logger.getBuffer().length).toBe(1);

      logger.clearBuffer();
      expect(logger.getBuffer().length).toBe(0);
    });

    it('should get recent logs with count', () => {
      for (let i = 0; i < 15; i++) {
        logger.logError(
          new NetworkError('timeout', `Error ${i}`),
          `source-${i}`
        );
      }

      const recent = logger.getRecentLogs(5);
      expect(recent.length).toBe(5);
      expect(recent[0].source).toBe('source-14');
      expect(recent[4].source).toBe('source-10');
    });
  });

  describe('export functionality', () => {
    beforeEach(() => {
      logger.generateRequestId();
      logger.logError(new NetworkError('timeout', 'Net error'), 'http-service');
      logger.logError(
        new ValidationError('schema-mismatch', 'Val error'),
        'validation-service'
      );
    });

    it('should export logs as JSON', () => {
      const json = logger.exportLogsAsJson();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].source).toBe('validation-service');
      expect(parsed[1].source).toBe('http-service');
    });

    it('should export logs as CSV', () => {
      const csv = logger.exportLogsAsCsv();
      const lines = csv.split('\n');

      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('requestId');
      expect(lines[0]).toContain('errorType');
      expect(lines[0]).toContain('code');
      expect(lines[0]).toContain('message');
      expect(lines[0]).toContain('source');

      expect(lines.length).toBe(3);
    });

    it('should properly escape quotes in CSV export', () => {
      logger.clearBuffer();
      logger.logError(
        new NetworkError('timeout', 'Error with "quotes"'),
        'source'
      );

      const csv = logger.exportLogsAsCsv();
      expect(csv).toContain('"Error with ""quotes"""');
    });
  });

  describe('reset functionality', () => {
    it('should reset all state', () => {
      logger.setRequestId('test-id');
      logger.addBreadcrumb('step 1');
      logger.logError(new NetworkError('Error', 'timeout'), 'source');

      expect(logger.getBuffer().length).toBe(1);

      logger.reset();

      expect(logger.getBuffer().length).toBe(0);
      expect(logger.getRecentLogs(10).length).toBe(0);
    });
  });

  describe('global logger instance', () => {
    beforeEach(() => {
      resetGlobalErrorLogger();
    });

    afterEach(() => {
      resetGlobalErrorLogger();
    });

    it('should create global logger on first access', () => {
      const logger1 = getGlobalErrorLogger({ enableConsoleLogging: false });
      expect(logger1).toBeDefined();
    });

    it('should return same instance on subsequent calls', () => {
      const logger1 = getGlobalErrorLogger({ enableConsoleLogging: false });
      const logger2 = getGlobalErrorLogger({ enableConsoleLogging: false });

      expect(logger1).toBe(logger2);
    });

    it('should reset global logger instance', () => {
      const logger1 = getGlobalErrorLogger({ enableConsoleLogging: false });
      logger1.logError(new NetworkError('Error', 'timeout'), 'source');
      expect(logger1.getBuffer().length).toBe(1);

      resetGlobalErrorLogger();

      const logger2 = getGlobalErrorLogger({ enableConsoleLogging: false });
      expect(logger2.getBuffer().length).toBe(0);
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('console logging', () => {
    it('should log to console when enabled', () => {
      const loggerWithConsole = new ErrorLogger({
        enableConsoleLogging: true,
      });

      const error = new NetworkError('timeout', 'Test error');
      loggerWithConsole.logError(error, 'test-source');

      expect(console.error).toHaveBeenCalled();
      const callArgs = (console.error as any).mock.calls[0];
      expect(callArgs[0]).toContain('[ErrorLogger]');
    });

    it('should not log to console when disabled', () => {
      const loggerNoConsole = new ErrorLogger({
        enableConsoleLogging: false,
      });

      const error = new NetworkError('timeout', 'Test error');
      loggerNoConsole.logError(error, 'test-source');

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should not buffer when buffer logging disabled', () => {
      const loggerNoBuffer = new ErrorLogger({
        enableBufferLogging: false,
        enableConsoleLogging: false,
      });

      const error = new NetworkError('Test error', 'timeout');
      loggerNoBuffer.logError(error, 'test-source');

      expect(loggerNoBuffer.getBuffer().length).toBe(0);
    });
  });
});
