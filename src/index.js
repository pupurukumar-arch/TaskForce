import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

if (process.env.NODE_ENV === "production") {
  const requiredEnvironmentVariables = [
    "MONGO_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "CORS_ORIGIN",
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

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
