import { rateLimit } from "express-rate-limit";

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Local development makes several API calls while pages reload. Keep the
  // production protection strict without interrupting normal local testing.
  limit: process.env.NODE_ENV === "production" ? 100 : 1000,
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
