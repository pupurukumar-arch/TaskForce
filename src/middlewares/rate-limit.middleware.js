import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

const redisClient = getRedisClient();

const redisStore = (prefix) =>
  redisClient
    ? new RedisStore({
        prefix,
        sendCommand: (...args) => redisClient.sendCommand(args),
      })
    : undefined;

const rateLimitResponse = (message) => (_req, res) => {
  res.status(429).json({
    statusCode: 429,
    data: null,
    message,
    success: false,
    errors: [],
  });
};

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Local development makes several API calls while pages reload. Keep the
  // production protection strict without interrupting normal local testing.
  limit: process.env.NODE_ENV === "production" ? 100 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitResponse(
    "Too many requests. Please try again in 15 minutes.",
  ),
});

// On Vercel, this uses Redis so all function instances share one counter.
// Without REDIS_URL (local development), express-rate-limit safely uses memory.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: redisStore("taskforce:auth-rate-limit:"),
  handler: rateLimitResponse(
    "Too many authentication requests. Please try again in 15 minutes.",
  ),
});

// Gemini calls are comparatively expensive. Redis keeps this limit shared
// across Vercel function instances when REDIS_URL is configured.
const projectPulseRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: redisStore("taskforce:project-pulse-rate-limit:"),
  handler: rateLimitResponse(
    "Too many Project Pulse questions. Please try again in 15 minutes.",
  ),
});

export { apiRateLimiter, authRateLimiter, projectPulseRateLimiter };
