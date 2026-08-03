import multer from "multer";
import path from "path";
import crypto from "crypto";
import { ApiError } from "../utils/api-error.js";

const allowedAttachmentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `./public/images`);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
    );
  },
});

export const upload = multer({
  storage,
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
