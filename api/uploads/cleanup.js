import { getContent } from "../../lib/db.js";
import { requireAuth, sendJson } from "../../lib/auth.js";
import { list, del } from "@vercel/blob";

function collectUploadReferences(value, results = new Set()) {
  if (typeof value === "string" && (value.includes("public.blob.vercel-storage.com") || value.startsWith("/uploads/"))) {
    results.add(value);
    return results;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadReferences(item, results));
    return results;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectUploadReferences(item, results));
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!(await requireAuth(req, res))) return;

  try {
    const [content, blobs] = await Promise.all([
      getContent(),
      list()
    ]);

    const referenced = collectUploadReferences(content);
    const toDelete = blobs.blobs.filter(blob => !referenced.has(blob.url));
    
    if (toDelete.length > 0) {
      await del(toDelete.map(b => b.url));
    }

    return sendJson(res, 200, {
      ok: true,
      deletedCount: toDelete.length,
      deleted: toDelete.map(b => b.url),
      skippedCount: 0,
      skipped: []
    });
  } catch (error) {
    return sendJson(res, 500, { error: "Cleanup failed" });
  }
}
