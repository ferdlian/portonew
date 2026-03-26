import { deleteAdminSession } from "../lib/db.js";
import { clearSessionCookie, getSessionToken, sendJson } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const token = getSessionToken(req);
  await deleteAdminSession(token);
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}
