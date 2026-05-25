import crypto from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export function validateReceipt(file: Express.Multer.File) {
  if (!allowedMimeTypes.has(file.mimetype)) throw new Error("INVALID_RECEIPT_MIME");
  if (file.size > maxBytes) throw new Error("RECEIPT_TOO_LARGE");
}

export async function uploadReceipt(file: Express.Multer.File, expenseId: string) {
  validateReceipt(file);
  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  const key = `receipts/${expenseId}/${crypto.randomUUID()}-${file.originalname}`;

  if (config.S3_BUCKET && config.S3_REGION) {
    const client = new S3Client({
      region: config.S3_REGION,
      credentials: config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
        : undefined
    });
    await client.send(new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
  }

  return { key, sha256 };
}
