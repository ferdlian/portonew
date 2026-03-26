import { getAuthInfo } from "../lib/db.js";
import { getCurrentSession, sendJson } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const session = await getCurrentSession(req);
    const authInfo = await getAuthInfo();

    return sendJson(res, 200, {
      authenticated: Boolean(session),
      username: session?.username || null,
      usingDefaultPassword: authInfo.usingDefaultPassword,
      defaultAdminUsername: authInfo.defaultAdminUsername,
      adminUserCount: authInfo.adminUserCount,
      schemaVersion: authInfo.schemaVersion
    });
  } catch (error) {
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
