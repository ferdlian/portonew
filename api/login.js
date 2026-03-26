import { authenticateAdmin, createAdminSession, getAuthInfo } from "../lib/db.js";
import { readBody, sendJson, setSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req, 20_000);
    const payload = JSON.parse(body);
    const user = await authenticateAdmin(
      payload.username || process.env.ADMIN_USERNAME || "admin",
      payload.password || ""
    );

    if (!user) {
      return sendJson(res, 401, { error: "Invalid password" });
    }

    const token = await createAdminSession(user.id);
    const authInfo = await getAuthInfo();
    setSessionCookie(res, token);
    
    return sendJson(res, 200, {
      ok: true,
      username: user.username,
      usingDefaultPassword: authInfo.usingDefaultPassword,
      defaultAdminUsername: authInfo.defaultAdminUsername
    });
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid login payload" });
  }
}
