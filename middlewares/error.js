import ErrorResponse from "../utils/errorResponse.js";

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;
  console.log(err);

  let message = "Internal error";

  switch (err.name) {
    case "CastError":
      message = `Resource not found`;
      error = new ErrorResponse(message, 404);
      break;
    case "ValidationError":
      message = Object.values(err.errors)
        .map((val) => val.message)
        .toString();
      error = new ErrorResponse(message, 400);
      break;

    default:
      message = "Internal Error";
      break;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
  });
  next();
};

export default errorHandler;
