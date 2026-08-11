import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { ApiError } from "./utils/api-error.js";
import { openapiSpecification } from "./docs/openapi.js";
import { apiRateLimiter } from "./middlewares/rate-limit.middleware.js";
import { enforceTrustedOrigin } from "./middlewares/security.middleware.js";

const app = express();
// Vercel forwards the original client IP. Trust only its immediate proxy so
// rate limits use the visitor IP rather than the platform proxy address.
if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// basic configurations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(enforceTrustedOrigin(allowedOrigins));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpecification, {
    customSiteTitle: "TaskForce API Docs",
  }),
);

// cors configurations
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (for example health checks) are safe to allow.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use("/api/v1", apiRateLimiter);

//  import the routes

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import noteRouter from "./routes/note.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import softboardRouter from "./routes/softboard.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/notes", noteRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/softboard", softboardRouter);

app.get("/", (req, res) => {
  res.send("Welcome to basecampy");
});

app.use(errorHandler);

export default app;
