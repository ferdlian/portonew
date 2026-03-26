import { put } from "@vercel/blob";
import { requireAuth, readBody, sendJson } from "../lib/auth.js";
import crypto from "node:crypto";

const allowedUploadTypes = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

const maxUploadBytes = 5 * 1024 * 1024;

function detectImageExtension(buffer) {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return ".png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii").startsWith("GIF")) return ".gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return ".webp";
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!(await requireAuth(req, res))) return;

  try {
    const body = await readBody(req);
    const payload = JSON.parse(body);
    const dataUrlMatch = String(payload.dataUrl || "").trim().match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/);
    
    if (!dataUrlMatch) return sendJson(res, 400, { error: "Invalid image format." });
    
    const mimeType = dataUrlMatch[1];
    const extension = allowedUploadTypes[mimeType];

    if (!extension) {
      return sendJson(res, 400, { error: "Unsupported image type. PNG, JPG, WEBP, dan GIF saja." });
    }

    const base64 = dataUrlMatch[2].replace(/\s+/g, "");
    const buffer = Buffer.from(base64, "base64");
    const detectedExtension = detectImageExtension(buffer);

    if (!detectedExtension || detectedExtension !== extension) {
      return sendJson(res, 400, { error: "Uploaded file content does not match the selected image type" });
    }

    if (buffer.byteLength === 0 || buffer.byteLength > maxUploadBytes) {
      return sendJson(res, 400, { error: "Ukuran gambar maksimal 5 MB." });
    }

    const filename = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType
    });

    return sendJson(res, 200, { ok: true, url: blob.url });
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid upload payload" });
  }
}
