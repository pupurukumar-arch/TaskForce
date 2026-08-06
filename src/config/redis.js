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
    const connectionUrl = new URL(process.env.REDIS_URL);
    const usesUpstashTcp = connectionUrl.hostname.endsWith(".upstash.io");

    redisClient = createClient({
      url: process.env.REDIS_URL,
      // Upstash's TCP URL is redis://..., while its documented CLI command
      // enables TLS separately. Keep that transport secure for node-redis too.
      ...(usesUpstashTcp ? { socket: { tls: true } } : {}),
    });
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
