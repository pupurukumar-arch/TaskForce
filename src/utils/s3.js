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

const getS3Client = () => new S3Client({
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

export const getAttachmentUrl = async (key) => {
  if (isTestEnvironment) return `https://example.test/attachments/${encodeURIComponent(key)}`;

  ensureS3Settings();
  try {
    return await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
      { expiresIn: 300 },
    );
  } catch (error) {
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
