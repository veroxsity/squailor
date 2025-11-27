'use strict';

/**
 * Logger utility for consistent error handling across the app
 * In development, logs everything. In production, only errors and warnings.
 */

let isDev = true;
try {
  const electron = require('electron');
  isDev = process.env.NODE_ENV === 'development' || !electron?.app?.isPackaged;
} catch (_) {
  // Not in Electron context (e.g., tests)
  isDev = process.env.NODE_ENV !== 'production';
}

/**
 * Log levels
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = isDev ? LogLevel.DEBUG : LogLevel.WARN;

/**
 * Format a log message with timestamp and context
 * @param {string} level - Log level name
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {*} [data] - Additional data
 * @returns {string}
 */
function formatMessage(level, context, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${context}] ${message}${dataStr}`;
}

/**
 * Create a logger instance for a specific context/module
 * @param {string} context - Module or context name
 * @returns {Object} Logger instance
 */
function createLogger(context) {
  return {
    /**
     * Debug level logging (development only)
     * @param {string} message
     * @param {*} [data]
     */
    debug(message, data) {
      if (currentLevel <= LogLevel.DEBUG) {
        console.log(formatMessage('DEBUG', context, message, data));
      }
    },

    /**
     * Info level logging
     * @param {string} message
     * @param {*} [data]
     */
    info(message, data) {
      if (currentLevel <= LogLevel.INFO) {
        console.info(formatMessage('INFO', context, message, data));
      }
    },

    /**
     * Warning level logging
     * @param {string} message
     * @param {*} [data]
     */
    warn(message, data) {
      if (currentLevel <= LogLevel.WARN) {
        console.warn(formatMessage('WARN', context, message, data));
      }
    },

    /**
     * Error level logging
     * @param {string} message
     * @param {Error|*} [error]
     */
    error(message, error) {
      if (currentLevel <= LogLevel.ERROR) {
        const errorInfo = error instanceof Error 
          ? { message: error.message, stack: error.stack }
          : error;
        console.error(formatMessage('ERROR', context, message, errorInfo));
      }
    },

    /**
     * Log an error and return a safe error message for the user
     * @param {string} message - Internal message
     * @param {Error|*} error - The error
     * @param {string} [userMessage] - Safe message to return to user
     * @returns {string} User-safe error message
     */
    errorSafe(message, error, userMessage) {
      this.error(message, error);
      return userMessage || 'An unexpected error occurred';
    }
  };
}

/**
 * Wrap an async function with error logging
 * @param {string} context - Context name
 * @param {string} operation - Operation name
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function withErrorLogging(context, operation, fn) {
  const logger = createLogger(context);
  
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`${operation} failed`, error);
      throw error;
    }
  };
}

/**
 * Safely execute a function, logging any errors but not throwing
 * @param {string} context - Context name
 * @param {string} operation - Operation name
 * @param {Function} fn - Function to execute
 * @param {*} [fallback] - Fallback value on error
 * @returns {*} Result or fallback
 */
function safeExecute(context, operation, fn, fallback = undefined) {
  const logger = createLogger(context);
  
  try {
    return fn();
  } catch (error) {
    logger.warn(`${operation} failed silently`, error);
    return fallback;
  }
}

/**
 * Safely execute an async function, logging any errors but not throwing
 * @param {string} context - Context name
 * @param {string} operation - Operation name
 * @param {Function} fn - Async function to execute
 * @param {*} [fallback] - Fallback value on error
 * @returns {Promise<*>} Result or fallback
 */
async function safeExecuteAsync(context, operation, fn, fallback = undefined) {
  const logger = createLogger(context);
  
  try {
    return await fn();
  } catch (error) {
    logger.warn(`${operation} failed silently`, error);
    return fallback;
  }
}

module.exports = {
  createLogger,
  withErrorLogging,
  safeExecute,
  safeExecuteAsync,
  LogLevel,
  isDev
};
