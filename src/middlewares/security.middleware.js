import { ApiError } from "../utils/api-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const objectIdPattern = /^[a-f\d]{24}$/i;

const enforceTrustedOrigin = (allowedOrigins) => (req, _res, next) => {
  if (safeMethods.has(req.method)) return next();

  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");

  if (origin && !allowedOrigins.includes(origin)) {
    return next(new ApiError(403, "Request origin is not allowed"));
  }

  if (!origin && fetchSite === "cross-site") {
    return next(new ApiError(403, "Cross-site request is not allowed"));
  }

  return next();
};

const validateObjectIdParam = (_req, _res, next, value, name) => {
  if (!objectIdPattern.test(value)) {
    return next(new ApiError(400, `${name} must be a valid identifier`));
  }

  return next();
};

export { enforceTrustedOrigin, validateObjectIdParam };
