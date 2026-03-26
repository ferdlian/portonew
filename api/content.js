import { getContent, saveContent } from "../lib/db.js";
import { readBody, requireAuth, sendJson } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const content = await getContent();
      return sendJson(res, 200, content);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to load content" });
    }
  }

  if (req.method === "PUT") {
    if (!(await requireAuth(req, res))) return;

    try {
      const body = await readBody(req, 1_000_000);
      const payload = JSON.parse(body);
      await saveContent(payload);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.message || "Invalid JSON payload" });
    }
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}
