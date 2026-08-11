import crypto from "crypto";
import path from "path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "./api-error.js";

const requiredSettings = [
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

const ensureS3Settings = () => {
  const missingSetting = requiredSettings.find((setting) => !process.env[setting]);
  if (missingSetting) {
    throw new ApiError(503, `File storage is not configured (${missingSetting} is missing)`);
  }
};

let s3Client;
const getS3Client = () => s3Client ||= new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = () => process.env.AWS_S3_BUCKET;
const isTestEnvironment = process.env.NODE_ENV === "test";

const toStorageError = (error) => {
  if (error instanceof ApiError) return error;
  return new ApiError(502, "Attachment storage is temporarily unavailable");
};

export const uploadTaskAttachment = async (file) => {
  if (isTestEnvironment) {
    return {
      key: `test-attachments/${crypto.randomUUID()}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  ensureS3Settings();
  const extension = path.extname(file.originalname || "").toLowerCase();
  const key = `task-attachments/${crypto.randomUUID()}${extension}`;

  try {
    await getS3Client().send(new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
  } catch (error) {
    throw toStorageError(error);
  }

  return { key, mimetype: file.mimetype, size: file.size };
};

export const uploadProjectBrief = async (file) => {
  const attachment = await uploadTaskAttachment(file);
  return { ...attachment, name: file.originalname };
};

export const uploadTaskAttachments = (files = []) =>
  Promise.all(files.map(uploadTaskAttachment));

const attachmentDisposition = (name, mimetype) => {
  const disposition = mimetype === "application/pdf" ? "inline" : "attachment";
  if (!name) return disposition;

  const safeName = path.basename(name).replace(/[\r\n"]/g, "_");
  return `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
};

export const getAttachmentUrl = async (key, { mimetype, name } = {}) => {
  if (isTestEnvironment) return `https://example.test/attachments/${encodeURIComponent(key)}`;

  ensureS3Settings();
  try {
    const command = new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ...(mimetype && { ResponseContentType: mimetype }),
      ...(name && { ResponseContentDisposition: attachmentDisposition(name, mimetype) }),
    });
    return await getSignedUrl(
      getS3Client(),
      command,
      { expiresIn: 300 },
    );
  } catch (error) {
    throw toStorageError(error);
  }
};

// Server-side Project Pulse retrieval needs the private object bytes; this is
// never exposed to the browser and remains protected by normal project access.
export const getAttachmentBuffer = async (key) => {
  if (isTestEnvironment) return Buffer.alloc(0);

  ensureS3Settings();
  try {
    const response = await getS3Client().send(new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    }));
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    // Keep the provider detail in server logs only; it helps distinguish a
    // missing object from an IAM read-permission problem without exposing it.
    console.error("Private S3 attachment read failed", {
      code: error?.code || error?.Code || error?.name,
      message: error?.message,
    });
    throw toStorageError(error);
  }
};

export const withAttachmentUrls = async (task) => {
  const taskData = task.toObject ? task.toObject() : task;
  taskData.attachments = await Promise.all(
    (taskData.attachments || []).map(async (attachment) => ({
      ...attachment,
      url: attachment.key ? await getAttachmentUrl(attachment.key) : attachment.url,
    })),
  );
  return taskData;
};

// The board only renders the newest evidence link while a task is in review.
// Avoid signing every historical attachment before the board can appear.
export const withBoardAttachmentUrl = async (task) => {
  const taskData = task.toObject ? task.toObject() : task;
  const attachments = taskData.attachments || [];
  if (taskData.status !== "in_review" || !attachments.length) return taskData;

  const latestIndex = attachments.length - 1;
  taskData.attachments = [...attachments];
  const latest = taskData.attachments[latestIndex];
  taskData.attachments[latestIndex] = {
    ...latest,
    url: latest.key ? await getAttachmentUrl(latest.key) : latest.url,
  };
  return taskData;
};

export const deleteTaskAttachments = async (attachments = []) => {
  if (isTestEnvironment) return;

  const objects = attachments
    .filter((attachment) => attachment.key)
    .map((attachment) => ({ Key: attachment.key }));
  if (!objects.length) return;

  ensureS3Settings();
  try {
    await getS3Client().send(new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: { Objects: objects, Quiet: true },
    }));
  } catch (error) {
    throw toStorageError(error);
  }
};
