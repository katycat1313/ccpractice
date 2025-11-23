/**
 * DEBUG UTILITY - Cold Call Practice App
 * 
 * This utility provides comprehensive logging and error tracking
 * to quickly pinpoint issues during development and troubleshooting.
 * 
 * Usage:
 *   import { debugLog, debugError, debugWarn, debugTrace, getDebugReport } from '../lib/debugUtils';
 *   
 *   debugLog('MyComponent', 'User clicked button', { userId: 123 });
 *   debugError('AnimatedScriptView', 'Failed to scroll', new Error('...'));
 *   debugWarn('PracticePage', 'Recording may not be working');
 */

const DEBUG_ENABLED = true; // Set to false to disable all debugging in production
const LOG_HISTORY = [];
const MAX_LOGS = 500; // Keep last 500 logs in memory

// Color coding for console output
const COLORS = {
  LOG: '\x1b[36m',      // Cyan
  ERROR: '\x1b[31m',    // Red
  WARN: '\x1b[33m',     // Yellow
  SUCCESS: '\x1b[32m',  // Green
  INFO: '\x1b[34m',     // Blue
  RESET: '\x1b[0m',
};

/**
 * Main debug log function
 * @param {string} component - Component name (e.g., 'AnimatedScriptView')
 * @param {string} message - Message to log
 * @param {any} data - Additional data to log
 * @param {string} level - Log level: 'log', 'error', 'warn', 'success'
 */
function log(component, message, data = null, level = 'log') {
  if (!DEBUG_ENABLED) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    component,
    message,
    data,
    level,
    stack: new Error().stack,
  };

  // Add to history
  LOG_HISTORY.push(logEntry);
  if (LOG_HISTORY.length > MAX_LOGS) {
    LOG_HISTORY.shift();
  }

  // Console output
  const color = COLORS[level.toUpperCase()] || COLORS.LOG;
  const resetColor = COLORS.RESET;
  const formattedTime = timestamp.split('T')[1].substring(0, 8); // HH:MM:SS

  console.log(
    `${color}[${formattedTime}] [${level.toUpperCase()}] ${component}: ${message}${resetColor}`,
    data || ''
  );

  // Log to window for browser console inspection
  window.__ccpracticeLogs = window.__ccpracticeLogs || [];
  window.__ccpracticeLogs.push(logEntry);
}

/**
 * Log a regular message
 */
export function debugLog(component, message, data = null) {
  log(component, message, data, 'log');
}

/**
 * Log an error with full error details
 */
export function debugError(component, message, error = null, additionalData = null) {
  const errorData = {
    message: error?.message || 'Unknown error',
    stack: error?.stack || 'No stack trace',
    ...additionalData,
  };
  log(component, message, errorData, 'error');
}

/**
 * Log a warning
 */
export function debugWarn(component, message, data = null) {
  log(component, message, data, 'warn');
}

/**
 * Log a success message
 */
export function debugSuccess(component, message, data = null) {
  log(component, message, data, 'success');
}

/**
 * Log component lifecycle events
 */
export function debugTrace(component, eventType, data = null) {
  const traceData = {
    event: eventType,
    timestamp: new Date().toISOString(),
    ...data,
  };
  log(component, `[TRACE] ${eventType}`, traceData, 'info');
}

/**
 * Validate required props and return errors
 */
export function validateProps(component, props, requiredProps) {
  const missingProps = requiredProps.filter(prop => props[prop] === undefined);
  
  if (missingProps.length > 0) {
    debugError(
      component,
      `Missing required props: ${missingProps.join(', ')}`,
      null,
      { receivedProps: Object.keys(props) }
    );
    return { isValid: false, missingProps };
  }

  debugSuccess(component, `All required props validated`, { count: requiredProps.length });
  return { isValid: true, missingProps: [] };
}

/**
 * Get comprehensive debug report
 */
export function getDebugReport() {
  return {
    totalLogs: LOG_HISTORY.length,
    errors: LOG_HISTORY.filter(log => log.level === 'error'),
    warnings: LOG_HISTORY.filter(log => log.level === 'warn'),
    recentLogs: LOG_HISTORY.slice(-50),
    fullHistory: LOG_HISTORY,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export debug logs as JSON for file download
 */
export function exportDebugLogs() {
  const report = getDebugReport();
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const a = document.createElement('a');
  a.href = url;
  a.download = `ccpractice-debug-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  debugSuccess('debugUtils', 'Debug logs exported successfully');
}

/**
 * Clear debug history
 */
export function clearDebugLogs() {
  LOG_HISTORY.length = 0;
  debugLog('debugUtils', 'Debug history cleared');
}

/**
 * Print debug summary to console
 */
export function printDebugSummary() {
  const report = getDebugReport();
  console.table({
    'Total Logs': report.totalLogs,
    'Errors': report.errors.length,
    'Warnings': report.warnings.length,
    'Timestamp': report.timestamp,
  });

  if (report.errors.length > 0) {
    console.log('Recent Errors:');
    report.errors.slice(-5).forEach(err => {
      console.log(`  - [${err.component}] ${err.message}`);
    });
  }
}

/**
 * Performance tracking utility
 */
export class PerformanceTracker {
  constructor(label) {
    this.label = label;
    this.startTime = performance.now();
    debugLog('PerformanceTracker', `Started: ${label}`);
  }

  end() {
    const duration = performance.now() - this.startTime;
    const level = duration > 100 ? 'warn' : 'success';
    debugLog(
      'PerformanceTracker',
      `Completed: ${this.label}`,
      { duration: `${duration.toFixed(2)}ms` },
      level
    );
    return duration;
  }
}

// Export all for easy access
export default {
  debugLog,
  debugError,
  debugWarn,
  debugSuccess,
  debugTrace,
  validateProps,
  getDebugReport,
  exportDebugLogs,
  clearDebugLogs,
  printDebugSummary,
  PerformanceTracker,
};
