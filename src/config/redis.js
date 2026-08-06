import { createClient } from "redis";
import dotenv from "dotenv";

// Vercel supplies variables before the function loads. Loading here also makes
// REDIS_URL available when the standalone local API imports its middleware.
dotenv.config({ path: "./.env", quiet: true });

let redisClient;
let redisConnection;

const getRedisClient = () => {
  if (!process.env.REDIS_URL) return null;

  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (error) => {
      console.error("Redis client error", error.message);
    });
  }

  return redisClient;
};

const connectRedis = async () => {
  const client = getRedisClient();
  if (!client || client.isReady) return client;

  redisConnection ||= client.connect().catch((error) => {
    redisConnection = undefined;
    throw error;
  });

  await redisConnection;
  return client;
};

export { connectRedis, getRedisClient };
