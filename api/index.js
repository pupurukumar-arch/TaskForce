import app from "../src/app.js";
import connectDB from "../src/db/index.js";
import { connectRedis } from "../src/config/redis.js";

let databaseConnection;
let redisConnection;

export default async function handler(req, res) {
  databaseConnection ||= connectDB(process.env.MONGO_URI);
  if (process.env.REDIS_URL) redisConnection ||= connectRedis();
  await Promise.all([databaseConnection, redisConnection]);
  return app(req, res);
}
