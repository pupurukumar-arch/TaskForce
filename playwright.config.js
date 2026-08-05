import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
import { assertSeparateTestDatabase } from "./src/db/index.js";

dotenv.config({ path: ".env", quiet: true });

const testMongoUri = process.env.TEST_MONGO_URI;

if (!testMongoUri) {
  throw new Error("TEST_MONGO_URI is required for browser tests.");
}

assertSeparateTestDatabase(testMongoUri, process.env.MONGO_URI);

export default defineConfig({
  testDir: "./test/browser",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm start",
      url: "http://127.0.0.1:3100/api/v1/healthcheck",
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: "test",
        TEST_MONGO_URI: testMongoUri,
        PORT: "3100",
        CORS_ORIGIN: "http://127.0.0.1:5174",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      cwd: "./frontend",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://127.0.0.1:3100/api/v1",
      },
    },
  ],
});
