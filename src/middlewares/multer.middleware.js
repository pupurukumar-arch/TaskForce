import multer from "multer";
import { ApiError } from "../utils/api-error.js";

const allowedAttachmentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export const upload = multer({
  // Keep files in memory briefly so the controller can send them to private S3.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1000 * 1000,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedAttachmentMimeTypes.has(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          "Only PDF, TXT, JPEG, PNG, and WEBP attachments are allowed",
        ),
      );
    }

    return cb(null, true);
  },
});
