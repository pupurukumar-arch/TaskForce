import { ApiError } from "../utils/api-error.js";

const errorHandler = (err, req, res, next) => {
  const statusCode =
    err instanceof ApiError || err.name === "CastError" || err.name === "BSONError"
      ? err.statusCode || 400
      : 500;

  return res.status(statusCode).json({
    statusCode,
    data: null,
    message: err.message || "Internal server error",
    success: false,
    errors: err.errors || [],
  });
};

export { errorHandler };
