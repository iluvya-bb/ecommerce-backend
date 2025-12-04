import { createLogger } from '../utils/logger.js';

const log = createLogger('REQUEST');

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with details
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  log.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    tenant: req.headers['x-tenant'],
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'success';

    log[level](`${req.method} ${req.path} - ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
};

export default requestLogger;
