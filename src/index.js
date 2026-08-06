import dotenv from "dotenv";
import connectDB, { assertSeparateTestDatabase } from "./db/index.js";
import { connectRedis } from "./config/redis.js";

dotenv.config({
  path: "./.env",
});

if (process.env.NODE_ENV === "production") {
  const requiredEnvironmentVariables = [
    "MONGO_URI",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",
    "CORS_ORIGIN",
    "FORGOT_PASSWORD_REDIRECT_URL",
    "PROJECT_INVITE_REDIRECT_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];
  const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
    (name) => !process.env[name],
  );

  if (missingEnvironmentVariables.length) {
    console.error(
      `Missing required production environment variables: ${missingEnvironmentVariables.join(", ")}`,
    );
    process.exit(1);
  }
}

const port = process.env.PORT || 3000;
const databaseUri =
  process.env.NODE_ENV === "test"
    ? process.env.TEST_MONGO_URI
    : process.env.MONGO_URI;

if (process.env.NODE_ENV === "test") {
  assertSeparateTestDatabase(process.env.TEST_MONGO_URI, process.env.MONGO_URI);
}

if (!databaseUri) {
  console.error("Missing database connection string");
  process.exit(1);
}

Promise.all([connectDB(databaseUri), connectRedis()])
  .then(async () => {
    const { default: app } = await import("./app.js");
    app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
