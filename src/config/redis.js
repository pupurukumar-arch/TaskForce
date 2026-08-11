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
    const configuredValue = process.env.REDIS_URL.trim();
    // Upstash shows a ready-to-run CLI command in its TCP panel. Accept that
    // exact copy format as well as the preferred raw redis:// connection URL.
    const connectionString = configuredValue.startsWith("redis-cli ")
      ? configuredValue.split(/\s+-u\s+/).at(-1)
      : configuredValue;
    const connectionUrl = new URL(connectionString);
    const usesUpstashTcp = connectionUrl.hostname.endsWith(".upstash.io");

    // node-redis derives TLS from the rediss:// scheme. Upstash's CLI uses
    // redis:// plus a separate --tls flag, so normalize only its TCP URL.
    if (usesUpstashTcp && connectionUrl.protocol === "redis:") {
      connectionUrl.protocol = "rediss:";
    }

    redisClient = createClient({
      url: connectionUrl.toString(),
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
