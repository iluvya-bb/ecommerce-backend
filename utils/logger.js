import chalk from 'chalk';

/**
 * Logger utility with structured logging and color-coded output
 * Provides different log levels: debug, info, warn, error, success
 */

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, category, message, data = null) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;

  let formattedMessage = `${prefix} ${message}`;

  if (data) {
    formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
  }

  return formattedMessage;
};

export const logger = {
  /**
   * Debug level logging (for development)
   */
  debug: (category, message, data = null) => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.log(chalk.gray(formatMessage('debug', category, message, data)));
    }
  },

  /**
   * Info level logging (general information)
   */
  info: (category, message, data = null) => {
    console.log(chalk.blue(formatMessage('info', category, message, data)));
  },

  /**
   * Success level logging (successful operations)
   */
  success: (category, message, data = null) => {
    console.log(chalk.green(formatMessage('success', category, message, data)));
  },

  /**
   * Warning level logging (non-critical issues)
   */
  warn: (category, message, data = null) => {
    console.warn(chalk.yellow(formatMessage('warn', category, message, data)));
  },

  /**
   * Error level logging (critical issues)
   */
  error: (category, message, error = null) => {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      ...(error.response?.data || {}),
    } : null;

    console.error(chalk.red(formatMessage('error', category, message, errorData)));
  },

  /**
   * Progress logging for long-running operations
   */
  progress: (category, message, percentage = null) => {
    const progressInfo = percentage !== null ? ` (${Math.floor(percentage)}%)` : '';
    console.log(chalk.cyan(formatMessage('progress', category, message + progressInfo)));
  },
};

/**
 * Create a categorized logger for specific modules
 */
export const createLogger = (category) => {
  return {
    debug: (message, data) => logger.debug(category, message, data),
    info: (message, data) => logger.info(category, message, data),
    success: (message, data) => logger.success(category, message, data),
    warn: (message, data) => logger.warn(category, message, data),
    error: (message, error) => logger.error(category, message, error),
    progress: (message, percentage) => logger.progress(category, message, percentage),
  };
};

export default logger;
