import { rateLimit } from "express-rate-limit";

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      statusCode: 429,
      data: null,
      message: "Too many requests. Please try again in 15 minutes.",
      success: false,
      errors: [],
    });
  },
});

export { apiRateLimiter };
