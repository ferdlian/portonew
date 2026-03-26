import { getContent, getAuthInfo } from "../lib/db.js";
import { requireAuth, sendJson } from "../lib/auth.js";
import { list } from "@vercel/blob";

function collectUploadReferences(value, results = new Set()) {
  if (typeof value === "string" && (value.includes("public.blob.vercel-storage.com") || value.startsWith("/uploads/"))) {
    // Both full Vercel Blob URLs and old local paths
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
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  if (!(await requireAuth(req, res))) return;

  try {
    const [content, authInfo, blobs] = await Promise.all([
      getContent(),
      getAuthInfo(),
      list()
    ]);

    const referencedUploads = collectUploadReferences(content);
    const unusedUploads = blobs.blobs.filter(blob => !referencedUploads.has(blob.url));
    
    // We can't easily check 'mtime' for Vercel Blobs without more API calls or metadata, 
    // so we'll just report unused ones.
    const cleanupReady = unusedUploads; 

    const uploadBytes = blobs.blobs.reduce((sum, blob) => sum + blob.size, 0);

    return sendJson(res, 200, {
      schemaVersion: authInfo.schemaVersion,
      adminUserCount: authInfo.adminUserCount,
      usingDefaultPassword: authInfo.usingDefaultPassword,
      projectsCount: content.projects.items.length,
      projectProgressCount: content.projectProgress?.items?.length || 0,
      projectTimelineCount: content.projectTimeline?.items?.length || 0,
      galleryCount: content.gallery.items.length,
      testimonialsCount: content.testimonials.items.length,
      beforeAfterCount: content.beforeAfter?.items?.length || 0,
      uploadCount: blobs.blobs.length,
      referencedUploadCount: referencedUploads.size,
      unusedUploadCount: unusedUploads.length,
      unusedUploadFiles: unusedUploads.map(b => b.url),
      cleanupEligibleCount: cleanupReady.length,
      cleanupEligibleFiles: cleanupReady.map(b => b.url),
      uploadBytes,
      quickLinks: [
        { label: "Edit Proyek", href: "#section-projects", hint: "Update portfolio dan detail project" },
        { label: "Progress Proyek", href: "#section-project-progress", hint: "Pilih proyek, atur progress, lalu tambah timeline dan foto" },
        { label: "Upload Foto", href: "#section-projects", hint: "Upload multi-image untuk project" },
        { label: "Before / After", href: "#section-before-after", hint: "Kelola transformasi renovasi" },
        { label: "Ganti Password", href: "#section-account", hint: "Amankan akun admin" },
        { label: "Preview Website", href: "/", hint: "Buka website publik" },
        { label: "Projects Directory", href: "/projects", hint: "Lihat semua project" }
      ],
      systemStatus: [
        { label: "Schema", value: `v${authInfo.schemaVersion}` },
        { label: "Admin user", value: String(authInfo.adminUserCount) },
        { label: "Project aktif", value: `${content.projectProgress?.items?.length || 0}` },
        { label: "Timeline items", value: `${content.projectTimeline?.items?.length || 0}` },
        { label: "Uploads used", value: `${referencedUploads.size}/${blobs.blobs.length}` },
        { label: "Unused estimate", value: `${unusedUploads.length}` },
        { label: "Cleanup ready", value: `${cleanupReady.length}` },
        { label: "Password default", value: authInfo.usingDefaultPassword ? "Yes" : "No" }
      ]
    });
  } catch (error) {
    return sendJson(res, 500, { error: "Failed to load dashboard summary" });
  }
}
