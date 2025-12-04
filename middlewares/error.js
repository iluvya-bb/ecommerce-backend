import ErrorResponse from "../utils/errorResponse.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ERROR");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  let message = "Internal error";

  // Log the error with context
  log.error("Error occurred", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
  });

  switch (err.name) {
    case "CastError":
      message = `Resource not found`;
      error = new ErrorResponse(message, 404);
      log.warn("Cast error - resource not found", {
        path: req.path,
        value: err.value,
      });
      break;
    case "ValidationError":
      message = Object.values(err.errors)
        .map((val) => val.message)
        .toString();
      error = new ErrorResponse(message, 400);
      log.warn("Validation error", {
        path: req.path,
        errors: Object.values(err.errors).map(e => ({ field: e.path, message: e.message })),
      });
      break;

    default:
      message = "Internal Error";
      break;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
    log.warn("Duplicate key error", {
      path: req.path,
      keyValue: err.keyValue,
    });
  }

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message).join(', ');
    error = new ErrorResponse(message, 400);
    log.warn("Sequelize validation error", {
      path: req.path,
      errors: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
    log.warn("Sequelize unique constraint error", {
      path: req.path,
      fields: err.fields,
    });
  }

  const statusCode = error.statusCode || 500;

  // Log final error response
  if (statusCode >= 500) {
    log.error("Server error response", {
      statusCode,
      message: error.message || message,
      path: req.path,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: error.message || "Server Error",
  });
};

export default errorHandler;
