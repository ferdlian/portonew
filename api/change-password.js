import { updateAdminPassword } from "../lib/db.js";
import { readBody, requireAuth, sendJson } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    const body = await readBody(req, 50_000);
    const payload = JSON.parse(body);
    const currentPassword = String(payload.currentPassword || "");
    const nextPassword = String(payload.nextPassword || "");

    if (nextPassword.length < 8) {
      return sendJson(res, 400, { error: "Password baru minimal 8 karakter" });
    }

    const result = await updateAdminPassword(session.userId, currentPassword, nextPassword);
    if (!result.ok) {
      return sendJson(res, 400, { error: "Password lama tidak valid" });
    }

    return sendJson(res, 200, { ok: true, username: result.username });
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid password payload" });
  }
}
