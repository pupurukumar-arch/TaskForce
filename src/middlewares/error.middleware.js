import { ApiError } from "../utils/api-error.js";
import multer from "multer";

const errorHandler = (err, req, res, next) => {
  const isClientError =
    err instanceof ApiError ||
    err.name === "CastError" ||
    err.name === "BSONError" ||
    err.name === "ValidationError" ||
    err instanceof multer.MulterError;
  const statusCode =
    err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
      ? 413
      : isClientError
        ? err.statusCode || 400
        : err.code === 11000
          ? 409
          : 500;
  const isProduction = process.env.NODE_ENV === "production";
  const message =
    statusCode === 500 && isProduction
      ? "Internal server error"
      : err.message || "Internal server error";

  if (statusCode === 500) console.error(err);
  return res.status(statusCode).json({
    statusCode,
    data: null,
    message,
    success: false,
    errors: isProduction && statusCode === 500 ? [] : err.errors || [],
  });
};

export { errorHandler };
