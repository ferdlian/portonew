import { getAdminSession } from "./db.js";

export function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf("=");
        const key = separatorIndex === -1 ? item : item.slice(0, separatorIndex);
        const value = separatorIndex === -1 ? "" : item.slice(separatorIndex + 1);
        try {
          return [key, decodeURIComponent(value)];
        } catch {
          return [key, value];
        }
      })
  );
}

export function getSessionToken(req) {
  return parseCookies(req).cms_session || "";
}

export async function getCurrentSession(req) {
  const token = getSessionToken(req);
  return await getAdminSession(token);
}

export async function requireAuth(req, res) {
  const session = await getCurrentSession(req);
  if (session) {
    return session;
  }

  res.statusCode = 401;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Unauthorized" }));
  return null;
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `cms_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "cms_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}

export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(body);
}

export async function readBody(req, limit = 10_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
