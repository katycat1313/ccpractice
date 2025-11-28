/**
 * Centralized logging utility
 * Provides consistent logging across the application with different log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

// Set log level based on environment
const CURRENT_LOG_LEVEL = import.meta.env.DEV ? LOG_LEVELS.TRACE : LOG_LEVELS.INFO;

// Color codes for different log levels
const COLORS = {
  ERROR: '#ff4444',
  WARN: '#ffaa00',
  INFO: '#4488ff',
  DEBUG: '#44ff88',
  TRACE: '#aaaaaa',
  SUCCESS: '#00ff00',
};

/**
 * Format log message with timestamp and context
 */
const formatMessage = (level, context, message, data) => {
  const timestamp = new Date().toISOString().substr(11, 12);
  return {
    timestamp,
    level,
    context,
    message,
    data,
  };
};

/**
 * Log with style
 */
const styledLog = (level, color, context, message, data) => {
  const formatted = formatMessage(level, context, message, data);

  console.log(
    `%c[${formatted.timestamp}] [${level}] ${context}:`,
    `color: ${color}; font-weight: bold;`,
    message,
    data !== undefined ? data : ''
  );
};

/**
 * Logger object with different log levels
 */
export const logger = {
  error: (context, message, error, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      styledLog('ERROR', COLORS.ERROR, context, message, data);
      if (error) {
        console.error(error);
      }
    }
  },

  warn: (context, message, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      styledLog('WARN', COLORS.WARN, context, message, data);
    }
  },

  info: (context, message, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      styledLog('INFO', COLORS.INFO, context, message, data);
    }
  },

  debug: (context, message, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      styledLog('DEBUG', COLORS.DEBUG, context, message, data);
    }
  },

  trace: (context, message, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.TRACE) {
      styledLog('TRACE', COLORS.TRACE, context, message, data);
    }
  },

  success: (context, message, data) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      styledLog('SUCCESS', COLORS.SUCCESS, context, message, data);
    }
  },
};

/**
 * Performance tracking utility
 */
export class PerformanceTracker {
  constructor(operation) {
    this.operation = operation;
    this.startTime = performance.now();
    logger.trace('Performance', `${operation} started`);
  }

  end() {
    const duration = performance.now() - this.startTime;
    logger.debug('Performance', `${this.operation} completed in ${duration.toFixed(2)}ms`);
    return duration;
  }
}
