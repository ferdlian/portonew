import { createClient } from "@libsql/client";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Configuration for local dev vs production
const client = createClient({
  url: url || "file:data/cms.db",
  authToken: authToken,
});

let defaultAdminConfig = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "bajaraya123",
  usingDefaultPassword: !process.env.ADMIN_PASSWORD
};

const SESSION_TTL_SECONDS = 60 * 60 * 24;

const settingKeys = [
  "site.title",
  "site.tagline",
  "hero.eyebrow",
  "hero.headline",
  "hero.description",
  "hero.backgroundImage",
  "hero.primaryCta.label",
  "hero.primaryCta.href",
  "hero.secondaryCta.label",
  "hero.secondaryCta.href",
  "hero.highlightLabel",
  "services.title",
  "services.description",
  "projects.title",
  "projects.description",
  "projectProgress.title",
  "projectProgress.description",
  "gallery.title",
  "gallery.description",
  "beforeAfter.title",
  "beforeAfter.description",
  "process.title",
  "testimonials.title",
  "testimonials.description",
  "testimonials.autoplayMs",
  "cta.title",
  "cta.description",
  "cta.buttonLabel",
  "cta.buttonHref",
  "contact.title",
  "contact.description",
  "contact.email",
  "contact.phone",
  "contact.address",
  "contact.hours",
  "contact.whatsapp",
  "footer.copyright"
];

const migrations = [
  {
    version: 1,
    name: "content_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nav_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        href TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hero_highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        meta TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        year TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gallery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS process_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
    `
  },
  {
    version: 2,
    name: "admin_auth_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
    `
  },
  {
    version: 3,
    name: "project_detail_and_before_after",
    sql: `
      ALTER TABLE projects ADD COLUMN slug TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN client TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN duration TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN area TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN scope TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN challenge TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN solution TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN result TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN gallery_image_a TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN gallery_image_b TEXT NOT NULL DEFAULT '';

      CREATE TABLE IF NOT EXISTS before_after_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_slug TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        summary TEXT NOT NULL,
        before_image TEXT NOT NULL,
        after_image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
    `
  },
  {
    version: 4,
    name: "project_multi_gallery",
    sql: `
      ALTER TABLE projects ADD COLUMN gallery_image_c TEXT NOT NULL DEFAULT '';
    `
  },
  {
    version: 5,
    name: "project_floorplan_materials_cta",
    sql: `
      ALTER TABLE projects ADD COLUMN floorplan_image TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN material_primary TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN material_secondary TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN material_accent TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN material_notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN cta_label TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN cta_href TEXT NOT NULL DEFAULT '';
    `
  },
  {
    version: 6,
    name: "auth_state",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  },
  {
    version: 7,
    name: "project_progress",
    sql: `
      CREATE TABLE IF NOT EXISTS project_progress_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_slug TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        phase TEXT NOT NULL,
        progress_percent TEXT NOT NULL,
        target_date TEXT NOT NULL,
        status_note TEXT NOT NULL,
        image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
    `
  },
  {
    version: 8,
    name: "project_progress_detail_fields",
    sql: `
      ALTER TABLE project_progress_items ADD COLUMN status_tone TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN status_label TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN update_point_a TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN update_point_b TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN update_point_c TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN image_b TEXT NOT NULL DEFAULT '';
      ALTER TABLE project_progress_items ADD COLUMN image_c TEXT NOT NULL DEFAULT '';
    `
  },
  {
    version: 9,
    name: "project_timeline_items",
    sql: `
      CREATE TABLE IF NOT EXISTS project_timeline_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_slug TEXT NOT NULL,
        title TEXT NOT NULL,
        date_label TEXT NOT NULL,
        note TEXT NOT NULL,
        image TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
    `
  }
];

const collectionLimits = {
  "site.nav": 12,
  "hero.highlights": 8,
  stats: 8,
  "services.items": 12,
  "projects.items": 50,
  "projectProgress.items": 30,
  "projectTimeline.items": 300,
  "gallery.items": 100,
  "beforeAfter.items": 50,
  "process.items": 12,
  "testimonials.items": 30
};

const maxStringLength = 5_000;

class ContentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContentValidationError";
    this.statusCode = 400;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function nowEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringOrFallback(value, fallback = "") {
  const normalized = String(value ?? fallback).trim();
  return normalized || fallback;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertPlainObject(value, label) {
  if (value === undefined) {
    return;
  }

  if (!isPlainObject(value)) {
    throw new ContentValidationError(`${label} harus berupa object.`);
  }
}

function assertArray(value, label, maxItems) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ContentValidationError(`${label} harus berupa array.`);
  }

  if (value.length > maxItems) {
    throw new ContentValidationError(`${label} maksimal ${maxItems} item.`);
  }

  value.forEach((item, index) => {
    if (!isPlainObject(item)) {
      throw new ContentValidationError(`${label}[${index + 1}] harus berupa object.`);
    }
  });
}

function assertStringValue(value, label, { allowEmpty = true, maxLength = maxStringLength } = {}) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    throw new ContentValidationError(`${label} harus berupa string.`);
  }

  if (!allowEmpty && value.trim() === "") {
    throw new ContentValidationError(`${label} tidak boleh kosong.`);
  }

  if (value.length > maxLength) {
    throw new ContentValidationError(`${label} terlalu panjang.`);
  }
}

function isValidHref(value) {
  return /^(#|\/|https?:\/\/|mailto:|tel:)/i.test(value);
}

function isValidImageReference(value) {
  return /^(\/|https?:\/\/)/i.test(value);
}

function assertHref(value, label) {
  assertStringValue(value, label);
  if (value !== undefined && value.trim() !== "" && !isValidHref(value)) {
    throw new ContentValidationError(`${label} harus berupa anchor, path lokal, atau URL yang valid.`);
  }
}

function assertImageReference(value, label) {
  assertStringValue(value, label);
  if (value !== undefined && value.trim() !== "" && !isValidImageReference(value)) {
    throw new ContentValidationError(`${label} harus berupa path lokal atau URL gambar yang valid.`);
  }
}

function assertProgressPercent(value, label) {
  assertStringValue(value, label, { allowEmpty: false });
  const normalized = String(value ?? "")
    .trim()
    .replace(/%$/, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new ContentValidationError(`${label} harus berupa angka 0 sampai 100.`);
  }
}

function normalizeProgressPercent(value, fallback = "0") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/%$/, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(Math.max(0, Math.min(100, Math.round(parsed))));
}

export function validateContent(content) {
  if (!isPlainObject(content)) {
    throw new ContentValidationError("Payload konten harus berupa object JSON.");
  }

  assertPlainObject(content.site, "site");
  assertPlainObject(content.hero, "hero");
  assertPlainObject(content.services, "services");
  assertPlainObject(content.projects, "projects");
  assertPlainObject(content.projectProgress, "projectProgress");
  assertPlainObject(content.projectTimeline, "projectTimeline");
  assertPlainObject(content.gallery, "gallery");
  assertPlainObject(content.beforeAfter, "beforeAfter");
  assertPlainObject(content.process, "process");
  assertPlainObject(content.testimonials, "testimonials");
  assertPlainObject(content.cta, "cta");
  assertPlainObject(content.contact, "contact");
  assertPlainObject(content.footer, "footer");

  assertArray(content.site?.nav, "site.nav", collectionLimits["site.nav"]);
  assertArray(content.hero?.highlights, "hero.highlights", collectionLimits["hero.highlights"]);
  assertArray(content.stats, "stats", collectionLimits.stats);
  assertArray(content.services?.items, "services.items", collectionLimits["services.items"]);
  assertArray(content.projects?.items, "projects.items", collectionLimits["projects.items"]);
  assertArray(content.projectProgress?.items, "projectProgress.items", collectionLimits["projectProgress.items"]);
  assertArray(content.projectTimeline?.items, "projectTimeline.items", collectionLimits["projectTimeline.items"]);
  assertArray(content.gallery?.items, "gallery.items", collectionLimits["gallery.items"]);
  assertArray(content.beforeAfter?.items, "beforeAfter.items", collectionLimits["beforeAfter.items"]);
  assertArray(content.process?.items, "process.items", collectionLimits["process.items"]);
  assertArray(content.testimonials?.items, "testimonials.items", collectionLimits["testimonials.items"]);

  assertStringValue(content.site?.title, "site.title");
  assertStringValue(content.site?.tagline, "site.tagline");
  assertStringValue(content.hero?.headline, "hero.headline");
  assertStringValue(content.hero?.eyebrow, "hero.eyebrow");
  assertStringValue(content.hero?.description, "hero.description");
  assertStringValue(content.projectProgress?.title, "projectProgress.title");
  assertStringValue(content.projectProgress?.description, "projectProgress.description");
  assertImageReference(content.hero?.backgroundImage, "hero.backgroundImage");
  assertHref(content.hero?.primaryCta?.href, "hero.primaryCta.href");
  assertHref(content.hero?.secondaryCta?.href, "hero.secondaryCta.href");
  assertHref(content.cta?.buttonHref, "cta.buttonHref");
  assertHref(content.contact?.whatsapp, "contact.whatsapp");

  arrayOrEmpty(content.site?.nav).forEach((item, index) => {
    assertStringValue(item.label, `site.nav[${index + 1}].label`, { allowEmpty: false });
    assertHref(item.href, `site.nav[${index + 1}].href`);
  });

  arrayOrEmpty(content.hero?.highlights).forEach((item, index) => {
    assertStringValue(item.label, `hero.highlights[${index + 1}].label`, { allowEmpty: false });
    assertStringValue(item.value, `hero.highlights[${index + 1}].value`, { allowEmpty: false });
  });

  arrayOrEmpty(content.stats).forEach((item, index) => {
    assertStringValue(item.value, `stats[${index + 1}].value`, { allowEmpty: false });
    assertStringValue(item.label, `stats[${index + 1}].label`, { allowEmpty: false });
  });

  arrayOrEmpty(content.services?.items).forEach((item, index) => {
    assertStringValue(item.title, `services.items[${index + 1}].title`, { allowEmpty: false });
    assertStringValue(item.description, `services.items[${index + 1}].description`, { allowEmpty: false });
    assertStringValue(item.meta, `services.items[${index + 1}].meta`);
  });

  arrayOrEmpty(content.projects?.items).forEach((item, index) => {
    const label = `projects.items[${index + 1}]`;
    assertStringValue(item.name, `${label}.name`, { allowEmpty: false });
    assertStringValue(item.slug, `${label}.slug`);
    assertStringValue(item.location, `${label}.location`);
    assertStringValue(item.year, `${label}.year`);
    assertStringValue(item.category, `${label}.category`);
    assertStringValue(item.summary, `${label}.summary`);
    assertStringValue(item.client, `${label}.client`);
    assertStringValue(item.duration, `${label}.duration`);
    assertStringValue(item.area, `${label}.area`);
    assertStringValue(item.scope, `${label}.scope`);
    assertStringValue(item.challenge, `${label}.challenge`);
    assertStringValue(item.solution, `${label}.solution`);
    assertStringValue(item.result, `${label}.result`);
    assertStringValue(item.materialPrimary, `${label}.materialPrimary`);
    assertStringValue(item.materialSecondary, `${label}.materialSecondary`);
    assertStringValue(item.materialAccent, `${label}.materialAccent`);
    assertStringValue(item.materialNotes, `${label}.materialNotes`);
    assertStringValue(item.ctaLabel, `${label}.ctaLabel`);
    assertImageReference(item.image, `${label}.image`);
    assertImageReference(item.galleryImageA, `${label}.galleryImageA`);
    assertImageReference(item.galleryImageB, `${label}.galleryImageB`);
    assertImageReference(item.galleryImageC, `${label}.galleryImageC`);
    assertImageReference(item.floorplanImage, `${label}.floorplanImage`);
    assertHref(item.ctaHref, `${label}.ctaHref`);
  });

  arrayOrEmpty(content.projectProgress?.items).forEach((item, index) => {
    const label = `projectProgress.items[${index + 1}]`;
    assertStringValue(item.projectSlug, `${label}.projectSlug`);
    assertStringValue(item.title, `${label}.title`, { allowEmpty: false });
    assertStringValue(item.location, `${label}.location`);
    assertStringValue(item.phase, `${label}.phase`, { allowEmpty: false });
    assertProgressPercent(item.progressPercent, `${label}.progressPercent`);
    assertStringValue(item.targetDate, `${label}.targetDate`);
    assertStringValue(item.statusTone, `${label}.statusTone`);
    assertStringValue(item.statusLabel, `${label}.statusLabel`);
    assertStringValue(item.statusNote, `${label}.statusNote`, { allowEmpty: false });
    assertStringValue(item.updatePointA, `${label}.updatePointA`);
    assertStringValue(item.updatePointB, `${label}.updatePointB`);
    assertStringValue(item.updatePointC, `${label}.updatePointC`);
    assertImageReference(item.image, `${label}.image`);
    assertImageReference(item.imageB, `${label}.imageB`);
    assertImageReference(item.imageC, `${label}.imageC`);
  });

  arrayOrEmpty(content.projectTimeline?.items).forEach((item, index) => {
    const label = `projectTimeline.items[${index + 1}]`;
    assertStringValue(item.projectSlug, `${label}.projectSlug`);
    assertStringValue(item.title, `${label}.title`, { allowEmpty: false });
    assertStringValue(item.dateLabel, `${label}.dateLabel`, { allowEmpty: false });
    assertStringValue(item.note, `${label}.note`, { allowEmpty: false });
    assertImageReference(item.image, `${label}.image`);
  });

  arrayOrEmpty(content.gallery?.items).forEach((item, index) => {
    assertStringValue(item.title, `gallery.items[${index + 1}].title`, { allowEmpty: false });
    assertStringValue(item.detail, `gallery.items[${index + 1}].detail`, { allowEmpty: false });
    assertImageReference(item.image, `gallery.items[${index + 1}].image`);
  });

  arrayOrEmpty(content.beforeAfter?.items).forEach((item, index) => {
    const label = `beforeAfter.items[${index + 1}]`;
    assertStringValue(item.projectSlug, `${label}.projectSlug`);
    assertStringValue(item.title, `${label}.title`, { allowEmpty: false });
    assertStringValue(item.location, `${label}.location`);
    assertStringValue(item.summary, `${label}.summary`, { allowEmpty: false });
    assertImageReference(item.beforeImage, `${label}.beforeImage`);
    assertImageReference(item.afterImage, `${label}.afterImage`);
  });

  arrayOrEmpty(content.process?.items).forEach((item, index) => {
    assertStringValue(item.step, `process.items[${index + 1}].step`, { allowEmpty: false });
    assertStringValue(item.title, `process.items[${index + 1}].title`, { allowEmpty: false });
    assertStringValue(item.description, `process.items[${index + 1}].description`, { allowEmpty: false });
  });

  arrayOrEmpty(content.testimonials?.items).forEach((item, index) => {
    const label = `testimonials.items[${index + 1}]`;
    assertStringValue(item.quote, `${label}.quote`, { allowEmpty: false });
    assertStringValue(item.name, `${label}.name`, { allowEmpty: false });
    assertStringValue(item.role, `${label}.role`);
    assertStringValue(item.projectName, `${label}.projectName`);
    assertImageReference(item.avatar, `${label}.avatar`);
    assertImageReference(item.projectImage, `${label}.projectImage`);
  });
}

function uniqueProjectSlug(rawSlug, name, usedSlugs) {
  const baseSlug = slugify(rawSlug || name || "project");
  let slug = baseSlug || "project";
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(slug);
  return slug;
}

export function normalizeContent(content) {
  const source = content && typeof content === "object" ? content : {};
  const usedProjectSlugs = new Set();

  const projects = arrayOrEmpty(source.projects?.items).map((item, index) => {
    const name = stringOrFallback(item?.name, `Project ${index + 1}`);
    const image = stringOrFallback(item?.image, "/assets/project-residence.svg");
    const slug = uniqueProjectSlug(item?.slug, name, usedProjectSlugs);

    return {
      name,
      slug,
      location: stringOrFallback(item?.location, "Lokasi proyek"),
      year: stringOrFallback(item?.year, String(new Date().getFullYear())),
      category: stringOrFallback(item?.category, "Project"),
      summary: stringOrFallback(item?.summary, "Ringkasan proyek"),
      image,
      client: stringOrFallback(item?.client, "Private client"),
      duration: stringOrFallback(item?.duration, "Custom timeline"),
      area: stringOrFallback(item?.area, "By request"),
      scope: stringOrFallback(item?.scope, "Design & build"),
      challenge: stringOrFallback(item?.challenge, "Tantangan proyek akan dijelaskan di sini."),
      solution: stringOrFallback(item?.solution, "Solusi proyek akan dijelaskan di sini."),
      result: stringOrFallback(item?.result, "Hasil proyek akan dijelaskan di sini."),
      galleryImageA: stringOrFallback(item?.galleryImageA, image),
      galleryImageB: stringOrFallback(item?.galleryImageB, image),
      galleryImageC: stringOrFallback(item?.galleryImageC, item?.galleryImageB || image),
      floorplanImage: stringOrFallback(item?.floorplanImage, image),
      materialPrimary: stringOrFallback(item?.materialPrimary, "Material utama"),
      materialSecondary: stringOrFallback(item?.materialSecondary, "Material kedua"),
      materialAccent: stringOrFallback(item?.materialAccent, "Accent material"),
      materialNotes: stringOrFallback(item?.materialNotes, "Catatan material proyek."),
      ctaLabel: stringOrFallback(item?.ctaLabel, "Konsultasikan Project Serupa"),
      ctaHref: stringOrFallback(item?.ctaHref, source.contact?.whatsapp || "/")
    };
  });

  const projectSlugSet = new Set(projects.map((item) => item.slug));
  const projectProgressItems = arrayOrEmpty(source.projectProgress?.items).map((item, index) => {
    const fallbackProject = projects[index] || projects[0];
    const requestedSlug = stringOrFallback(item?.projectSlug, fallbackProject?.slug || "");
    const safeSlug = projectSlugSet.has(requestedSlug) ? requestedSlug : fallbackProject?.slug || "";
    const relatedProject = projects.find((project) => project.slug === safeSlug) || fallbackProject;
    const progressPercent = normalizeProgressPercent(item?.progressPercent, "0");
    const progressNumber = Number(progressPercent);
    const fallbackStatusTone = progressNumber >= 85 ? "near-handover" : progressNumber >= 60 ? "on-track" : "attention";
    const fallbackStatusLabel =
      fallbackStatusTone === "near-handover"
        ? "Hampir handover"
        : fallbackStatusTone === "on-track"
          ? "On track"
          : "Perlu monitoring";

    return {
      projectSlug: safeSlug,
      title: stringOrFallback(item?.title, relatedProject?.name || `Proyek berjalan ${index + 1}`),
      location: stringOrFallback(item?.location, relatedProject?.location || "Lokasi proyek"),
      phase: stringOrFallback(item?.phase, "Pekerjaan berjalan"),
      progressPercent,
      targetDate: stringOrFallback(item?.targetDate, "Update target belum ditentukan"),
      statusTone: stringOrFallback(item?.statusTone, fallbackStatusTone),
      statusLabel: stringOrFallback(item?.statusLabel, fallbackStatusLabel),
      statusNote: stringOrFallback(item?.statusNote, "Update progress proyek akan tampil di sini."),
      updatePointA: stringOrFallback(item?.updatePointA, `Fase utama saat ini: ${stringOrFallback(item?.phase, "Pekerjaan berjalan")}.`),
      updatePointB: stringOrFallback(item?.updatePointB, `Target berikutnya diarahkan ke ${stringOrFallback(item?.targetDate, "jadwal berikutnya")}.`),
      updatePointC: stringOrFallback(item?.updatePointC, "Koordinasi owner, vendor, dan tim lapangan berjalan sesuai milestone aktif."),
      image: stringOrFallback(item?.image, relatedProject?.image || "/assets/project-office.svg"),
      imageB: stringOrFallback(item?.imageB, relatedProject?.galleryImageA || relatedProject?.image || "/assets/project-office.svg"),
      imageC: stringOrFallback(item?.imageC, relatedProject?.galleryImageB || relatedProject?.image || "/assets/project-office.svg")
    };
  });
  const projectTimelineItems = arrayOrEmpty(source.projectTimeline?.items).map((item, index) => {
    const fallbackProject = projects[index] || projects[0];
    const requestedSlug = stringOrFallback(item?.projectSlug, fallbackProject?.slug || "");
    const safeSlug = projectSlugSet.has(requestedSlug) ? requestedSlug : fallbackProject?.slug || "";
    const relatedProject = projects.find((project) => project.slug === safeSlug) || fallbackProject;

    return {
      projectSlug: safeSlug,
      title: stringOrFallback(item?.title, `Update ${index + 1}`),
      dateLabel: stringOrFallback(item?.dateLabel, "Update terbaru"),
      note: stringOrFallback(item?.note, "Catatan progres proyek akan tampil di sini."),
      image: stringOrFallback(item?.image, relatedProject?.image || "/assets/project-office.svg")
    };
  });

  return {
    site: {
      title: stringOrFallback(source.site?.title, "Swarna Habitat Studio"),
      tagline: stringOrFallback(source.site?.tagline, "Design, build, dan renovasi premium"),
      nav: arrayOrEmpty(source.site?.nav).map((item) => ({
        label: stringOrFallback(item?.label, "Menu"),
        href: stringOrFallback(item?.href, "#")
      }))
    },
    hero: {
      eyebrow: stringOrFallback(source.hero?.eyebrow, "Design & Build Premium"),
      headline: stringOrFallback(source.hero?.headline, "Headline hero"),
      description: stringOrFallback(source.hero?.description, "Deskripsi hero"),
      backgroundImage: stringOrFallback(source.hero?.backgroundImage, projects[0]?.image || "/assets/project-residence.svg"),
      primaryCta: {
        label: stringOrFallback(source.hero?.primaryCta?.label, "Hubungi Kami"),
        href: stringOrFallback(source.hero?.primaryCta?.href, "#contact")
      },
      secondaryCta: {
        label: stringOrFallback(source.hero?.secondaryCta?.label, "Lihat Project"),
        href: stringOrFallback(source.hero?.secondaryCta?.href, "#projects")
      },
      highlightLabel: stringOrFallback(source.hero?.highlightLabel, "Highlights"),
      highlights: arrayOrEmpty(source.hero?.highlights).map((item) => ({
        label: stringOrFallback(item?.label, "Label"),
        value: stringOrFallback(item?.value, "Value")
      }))
    },
    stats: arrayOrEmpty(source.stats).map((item) => ({
      value: stringOrFallback(item?.value, "0"),
      label: stringOrFallback(item?.label, "Stat")
    })),
    services: {
      title: stringOrFallback(source.services?.title, "Layanan"),
      description: stringOrFallback(source.services?.description, "Deskripsi layanan"),
      items: arrayOrEmpty(source.services?.items).map((item, index) => ({
        title: stringOrFallback(item?.title, `Layanan ${index + 1}`),
        description: stringOrFallback(item?.description, "Deskripsi layanan"),
        meta: stringOrFallback(item?.meta, "Service")
      }))
    },
    projects: {
      title: stringOrFallback(source.projects?.title, "Projects"),
      description: stringOrFallback(source.projects?.description, "Deskripsi project"),
      items: projects
    },
    projectProgress: {
      title: stringOrFallback(source.projectProgress?.title, "Progress proyek berjalan"),
      description: stringOrFallback(
        source.projectProgress?.description,
        "Pantau fase terbaru dari proyek aktif yang sedang dikerjakan tim kami."
      ),
      items: projectProgressItems
    },
    projectTimeline: {
      items: projectTimelineItems
    },
    gallery: {
      title: stringOrFallback(source.gallery?.title, "Galeri"),
      description: stringOrFallback(source.gallery?.description, "Deskripsi galeri"),
      items: arrayOrEmpty(source.gallery?.items).map((item, index) => ({
        title: stringOrFallback(item?.title, `Galeri ${index + 1}`),
        detail: stringOrFallback(item?.detail, "Detail gambar"),
        image: stringOrFallback(item?.image, projects[0]?.image || "/assets/project-office.svg")
      }))
    },
    beforeAfter: {
      title: stringOrFallback(source.beforeAfter?.title, "Before / After"),
      description: stringOrFallback(source.beforeAfter?.description, "Deskripsi transformasi"),
      items: arrayOrEmpty(source.beforeAfter?.items).map((item, index) => {
        const fallbackSlug = projects[index]?.slug || projects[0]?.slug || "project";
        const requestedSlug = stringOrFallback(item?.projectSlug, fallbackSlug);
        return {
          projectSlug: projectSlugSet.has(requestedSlug) ? requestedSlug : fallbackSlug,
          title: stringOrFallback(item?.title, `Transformasi ${index + 1}`),
          location: stringOrFallback(item?.location, "Lokasi project"),
          summary: stringOrFallback(item?.summary, "Ringkasan before / after"),
          beforeImage: stringOrFallback(item?.beforeImage, projects[0]?.image || "/assets/project-residence.svg"),
          afterImage: stringOrFallback(item?.afterImage, projects[0]?.image || "/assets/project-residence.svg")
        };
      })
    },
    process: {
      title: stringOrFallback(source.process?.title, "Proses Kerja"),
      items: arrayOrEmpty(source.process?.items).map((item, index) => ({
        step: stringOrFallback(item?.step, String(index + 1).padStart(2, "0")),
        title: stringOrFallback(item?.title, `Tahap ${index + 1}`),
        description: stringOrFallback(item?.description, "Deskripsi tahap")
      }))
    },
    testimonials: {
      title: stringOrFallback(source.testimonials?.title, "Testimoni"),
      description: stringOrFallback(source.testimonials?.description, "Deskripsi testimoni"),
      autoplayMs: stringOrFallback(source.testimonials?.autoplayMs, "5000"),
      items: arrayOrEmpty(source.testimonials?.items).map((item, index) => ({
        quote: stringOrFallback(item?.quote, "Testimoni client"),
        name: stringOrFallback(item?.name, `Client ${index + 1}`),
        role: stringOrFallback(item?.role, "Client"),
        avatar: stringOrFallback(item?.avatar, "/assets/avatar-nadya.svg"),
        projectName: stringOrFallback(item?.projectName, projects[index]?.name || projects[0]?.name || "Project"),
        projectImage: stringOrFallback(item?.projectImage, projects[index]?.image || projects[0]?.image || "/assets/project-residence.svg")
      }))
    },
    cta: {
      title: stringOrFallback(source.cta?.title, "CTA Title"),
      description: stringOrFallback(source.cta?.description, "CTA Description"),
      buttonLabel: stringOrFallback(source.cta?.buttonLabel, "Buka CMS"),
      buttonHref: stringOrFallback(source.cta?.buttonHref, "/admin")
    },
    contact: {
      title: stringOrFallback(source.contact?.title, "Kontak"),
      description: stringOrFallback(source.contact?.description, "Deskripsi kontak"),
      email: stringOrFallback(source.contact?.email, "hello@example.com"),
      phone: stringOrFallback(source.contact?.phone, "+62 000 0000 0000"),
      address: stringOrFallback(source.contact?.address, "Alamat bisnis"),
      hours: stringOrFallback(source.contact?.hours, "Senin - Jumat"),
      whatsapp: stringOrFallback(source.contact?.whatsapp, "/")
    },
    footer: {
      copyright: stringOrFallback(source.footer?.copyright, "© 2026")
    }
  };
}

async function applyMigrations() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const appliedRes = await client.execute("SELECT version FROM schema_migrations ORDER BY version ASC");
  const applied = new Set(appliedRes.rows.map((row) => Number(row.version)));

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    const rawStatements = migration.sql.split(";").map(s => s.trim()).filter(Boolean);
    const statements = rawStatements.map(sql => ({ sql, args: [] }));
    
    statements.push({
      sql: "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
      args: [migration.version, migration.name, nowIso()]
    });

    await client.batch(statements, "write");
  }
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

function createPasswordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  return {
    salt,
    hash: hashPassword(password, salt)
  };
}

function verifyPassword(password, storedHash, storedSalt) {
  const computed = Buffer.from(hashPassword(password, storedSalt), "hex");
  const existing = Buffer.from(storedHash, "hex");

  if (computed.length !== existing.length) {
    return false;
  }

  return timingSafeEqual(computed, existing);
}

async function setAuthState(key, value) {
  await client.execute({
    sql: `
      INSERT INTO auth_state (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    args: [key, String(value ?? "")]
  });
}

async function getAuthState(key, fallback = "") {
  const res = await client.execute({
    sql: "SELECT value FROM auth_state WHERE key = ?",
    args: [key]
  });
  return res.rows[0] ? res.rows[0].value : fallback;
}

async function getSetting(key, fallback = "") {
  const res = await client.execute({
    sql: "SELECT value FROM site_settings WHERE key = ?",
    args: [key]
  });
  return res.rows[0] ? res.rows[0].value : fallback;
}

async function saveContentToDb(content) {
  const normalized = normalizeContent(content);
  const statements = [];

  for (const key of settingKeys) {
    const value = key.split(".").reduce((current, segment) => current?.[segment], normalized);
    statements.push({
      sql: `
        INSERT INTO site_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      args: [key, String(value ?? "")]
    });
  }

  // nav_items
  statements.push("DELETE FROM nav_items");
  normalized.site.nav.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO nav_items (label, href, sort_order) VALUES (?, ?, ?)",
      args: [item.label, item.href, index]
    });
  });

  // hero_highlights
  statements.push("DELETE FROM hero_highlights");
  normalized.hero.highlights.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO hero_highlights (label, value, sort_order) VALUES (?, ?, ?)",
      args: [item.label, item.value, index]
    });
  });

  // stats
  statements.push("DELETE FROM stats");
  normalized.stats.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO stats (value, label, sort_order) VALUES (?, ?, ?)",
      args: [item.value, item.label, index]
    });
  });

  // services
  statements.push("DELETE FROM services");
  normalized.services.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO services (title, description, meta, sort_order) VALUES (?, ?, ?, ?)",
      args: [item.title, item.description, item.meta, index]
    });
  });

  // projects
  statements.push("DELETE FROM projects");
  normalized.projects.items.forEach((item, index) => {
    statements.push({
      sql: `INSERT INTO projects (
        name, slug, location, year, category, summary, image, client, duration, area, scope,
        challenge, solution, result, gallery_image_a, gallery_image_b, gallery_image_c,
        floorplan_image, material_primary, material_secondary, material_accent, material_notes,
        cta_label, cta_href, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.name, item.slug || slugify(item.name), item.location, item.year, item.category, item.summary, item.image,
        item.client, item.duration, item.area, item.scope, item.challenge, item.solution, item.result,
        item.galleryImageA || item.image, item.galleryImageB || item.image, item.galleryImageC || item.galleryImageB || item.image,
        item.floorplanImage || "", item.materialPrimary || "", item.materialSecondary || "", item.materialAccent || "",
        item.materialNotes || "", item.ctaLabel || "", item.ctaHref || "", index
      ]
    });
  });

  // project_progress_items
  statements.push("DELETE FROM project_progress_items");
  normalized.projectProgress.items.forEach((item, index) => {
    statements.push({
      sql: `INSERT INTO project_progress_items (
        project_slug, title, location, phase, progress_percent, target_date, status_tone, status_label,
        status_note, update_point_a, update_point_b, update_point_c, image, image_b, image_c, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.projectSlug || "", item.title, item.location, item.phase, item.progressPercent, item.targetDate,
        item.statusTone, item.statusLabel, item.statusNote, item.updatePointA, item.updatePointB, item.updatePointC,
        item.image, item.imageB, item.imageC, index
      ]
    });
  });

  // project_timeline_items
  statements.push("DELETE FROM project_timeline_items");
  normalized.projectTimeline.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO project_timeline_items (project_slug, title, date_label, note, image, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [item.projectSlug || "", item.title, item.dateLabel, item.note, item.image, index]
    });
  });

  // gallery_items
  statements.push("DELETE FROM gallery_items");
  normalized.gallery.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO gallery_items (title, detail, image, sort_order) VALUES (?, ?, ?, ?)",
      args: [item.title, item.detail, item.image, index]
    });
  });

  // process_steps
  statements.push("DELETE FROM process_steps");
  normalized.process.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO process_steps (step, title, description, sort_order) VALUES (?, ?, ?, ?)",
      args: [item.step, item.title, item.description, index]
    });
  });

  // testimonials
  statements.push("DELETE FROM testimonials");
  normalized.testimonials.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO testimonials (quote, name, role, avatar, project_name, project_image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [item.quote, item.name, item.role, item.avatar, item.projectName, item.projectImage, index]
    });
  });

  // before_after_items
  statements.push("DELETE FROM before_after_items");
  normalized.beforeAfter.items.forEach((item, index) => {
    statements.push({
      sql: "INSERT INTO before_after_items (project_slug, title, location, summary, before_image, after_image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [item.projectSlug || slugify(item.title), item.title, item.location, item.summary, item.beforeImage, item.afterImage, index]
    });
  });

  await client.batch(statements, "write");
}

async function orderedRows(tableName) {
  const res = await client.execute(`SELECT * FROM ${tableName} ORDER BY sort_order ASC, id ASC`);
  return res.rows;
}

export async function initCmsDatabase({ seed }) {
  await applyMigrations();

  const existing = await client.execute("SELECT COUNT(*) AS count FROM site_settings");
  if (Number(existing.rows[0].count) === 0 && seed) {
    await saveContentToDb(seed);
  }

  const userCount = await client.execute("SELECT COUNT(*) AS count FROM admin_users");
  if (Number(userCount.rows[0].count) === 0) {
    const password = createPasswordRecord(defaultAdminConfig.password);
    const now = nowIso();
    await client.execute({
      sql: `
        INSERT INTO admin_users (username, password_hash, password_salt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [defaultAdminConfig.username, password.hash, password.salt, now, now]
    });
  }

  const authState = await getAuthState("default_credentials_active", "");
  if (authState === "") {
    let isDefaultCredentialActive = false;
    if (defaultAdminConfig.usingDefaultPassword) {
      const userRes = await client.execute({
        sql: "SELECT password_hash, password_salt FROM admin_users WHERE username = ?",
        args: [defaultAdminConfig.username]
      });
      const user = userRes.rows[0];
      isDefaultCredentialActive = Boolean(
        user && verifyPassword(defaultAdminConfig.password, String(user.password_hash), String(user.password_salt))
      );
    }
    await setAuthState("default_credentials_active", isDefaultCredentialActive ? "1" : "0");
  }
}

export async function getContent() {
  const [
    site_title, site_tagline, nav_items,
    hero_eyebrow, hero_headline, hero_description, hero_backgroundImage,
    hero_primaryCta_label, hero_primaryCta_href, hero_secondaryCta_label, hero_secondaryCta_href,
    hero_highlightLabel, hero_highlights,
    stats, services_title, services_description, services_items,
    projects_title, projects_description, projects_items,
    projectProgress_title, projectProgress_description, projectProgress_items,
    projectTimeline_items, gallery_title, gallery_description, gallery_items,
    beforeAfter_title, beforeAfter_description, beforeAfter_items,
    process_title, process_items, testimonials_title, testimonials_description,
    testimonials_autoplayMs, testimonials_items, cta_title, cta_description,
    cta_buttonLabel, cta_buttonHref, contact_title, contact_description,
    contact_email, contact_phone, contact_address, contact_hours, contact_whatsapp,
    footer_copyright
  ] = await Promise.all([
    getSetting("site.title"), getSetting("site.tagline"), orderedRows("nav_items"),
    getSetting("hero.eyebrow"), getSetting("hero.headline"), getSetting("hero.description"), getSetting("hero.backgroundImage"),
    getSetting("hero.primaryCta.label"), getSetting("hero.primaryCta.href"), getSetting("hero.secondaryCta.label"), getSetting("hero.secondaryCta.href"),
    getSetting("hero.highlightLabel"), orderedRows("hero_highlights"),
    orderedRows("stats"), getSetting("services.title"), getSetting("services.description"), orderedRows("services"),
    getSetting("projects.title"), getSetting("projects.description"), orderedRows("projects"),
    getSetting("projectProgress.title"), getSetting("projectProgress.description"), orderedRows("project_progress_items"),
    orderedRows("project_timeline_items"), getSetting("gallery.title"), getSetting("gallery.description"), orderedRows("gallery_items"),
    getSetting("beforeAfter.title"), getSetting("beforeAfter.description"), orderedRows("before_after_items"),
    getSetting("process.title"), orderedRows("process_steps"), getSetting("testimonials.title"), getSetting("testimonials.description"),
    getSetting("testimonials.autoplayMs", "5000"), orderedRows("testimonials"), getSetting("cta.title"), getSetting("cta.description"),
    getSetting("cta.buttonLabel"), getSetting("cta.buttonHref"), getSetting("contact.title"), getSetting("contact.description"),
    getSetting("contact.email"), getSetting("contact.phone"), getSetting("contact.address"), getSetting("contact.hours"), getSetting("contact.whatsapp"),
    getSetting("footer.copyright")
  ]);

  return {
    site: {
      title: site_title,
      tagline: site_tagline,
      nav: nav_items.map((row) => ({ label: row.label, href: row.href }))
    },
    hero: {
      eyebrow: hero_eyebrow,
      headline: hero_headline,
      description: hero_description,
      backgroundImage: hero_backgroundImage,
      primaryCta: { label: hero_primaryCta_label, href: hero_primaryCta_href },
      secondaryCta: { label: hero_secondaryCta_label, href: hero_secondaryCta_href },
      highlightLabel: hero_highlightLabel,
      highlights: hero_highlights.map((row) => ({ label: row.label, value: row.value }))
    },
    stats: stats.map((row) => ({ value: row.value, label: row.label })),
    services: {
      title: services_title,
      description: services_description,
      items: services_items.map((row) => ({ title: row.title, description: row.description, meta: row.meta }))
    },
    projects: {
      title: projects_title,
      description: projects_description,
      items: projects_items.map((row) => ({
        name: row.name,
        slug: row.slug || slugify(row.name),
        location: row.location,
        year: row.year,
        category: row.category,
        summary: row.summary,
        image: row.image,
        client: row.client,
        duration: row.duration,
        area: row.area,
        scope: row.scope,
        challenge: row.challenge,
        solution: row.solution,
        result: row.result,
        galleryImageA: row.gallery_image_a || row.image,
        galleryImageB: row.gallery_image_b || row.image,
        galleryImageC: row.gallery_image_c || row.gallery_image_b || row.image,
        floorplanImage: row.floorplan_image,
        materialPrimary: row.material_primary,
        materialSecondary: row.material_secondary,
        materialAccent: row.material_accent,
        materialNotes: row.material_notes,
        ctaLabel: row.cta_label,
        ctaHref: row.cta_href
      }))
    },
    projectProgress: {
      title: projectProgress_title,
      description: projectProgress_description,
      items: projectProgress_items.map((row) => ({
        projectSlug: row.project_slug,
        title: row.title,
        location: row.location,
        phase: row.phase,
        progressPercent: row.progress_percent,
        targetDate: row.target_date,
        statusTone: row.status_tone,
        statusLabel: row.status_label,
        statusNote: row.status_note,
        updatePointA: row.update_point_a,
        updatePointB: row.update_point_b,
        updatePointC: row.update_point_c,
        image: row.image,
        imageB: row.image_b,
        imageC: row.image_c
      }))
    },
    projectTimeline: {
      items: projectTimeline_items.map((row) => ({
        projectSlug: row.project_slug,
        title: row.title,
        dateLabel: row.date_label,
        note: row.note,
        image: row.image
      }))
    },
    gallery: {
      title: gallery_title,
      description: gallery_description,
      items: gallery_items.map((row) => ({ title: row.title, detail: row.detail, image: row.image }))
    },
    beforeAfter: {
      title: beforeAfter_title,
      description: beforeAfter_description,
      items: beforeAfter_items.map((row) => ({
        projectSlug: row.project_slug,
        title: row.title,
        location: row.location,
        summary: row.summary,
        beforeImage: row.before_image,
        afterImage: row.after_image
      }))
    },
    process: {
      title: process_title,
      items: process_items.map((row) => ({ step: row.step, title: row.title, description: row.description }))
    },
    testimonials: {
      title: testimonials_title,
      description: testimonials_description,
      autoplayMs: testimonials_autoplayMs,
      items: testimonials_items.map((row) => ({
        quote: row.quote,
        name: row.name,
        role: row.role,
        avatar: row.avatar,
        projectName: row.project_name,
        projectImage: row.project_image
      }))
    },
    cta: {
      title: cta_title,
      description: cta_description,
      buttonLabel: cta_buttonLabel,
      buttonHref: cta_buttonHref
    },
    contact: {
      title: contact_title,
      description: contact_description,
      email: contact_email,
      phone: contact_phone,
      address: contact_address,
      hours: contact_hours,
      whatsapp: contact_whatsapp
    },
    footer: {
      copyright: footer_copyright
    }
  };
}

export async function saveContent(content) {
  validateContent(content);
  await saveContentToDb(content);
}

export async function authenticateAdmin(username, password) {
  const res = await client.execute({
    sql: "SELECT id, username, password_hash, password_salt FROM admin_users WHERE username = ?",
    args: [username]
  });
  const user = res.rows[0];

  if (!user) return null;
  if (!verifyPassword(password, String(user.password_hash), String(user.password_salt))) return null;

  return { id: Number(user.id), username: String(user.username) };
}

export async function updateAdminPassword(userId, currentPassword, nextPassword) {
  const res = await client.execute({
    sql: "SELECT id, username, password_hash, password_salt FROM admin_users WHERE id = ?",
    args: [userId]
  });
  const user = res.rows[0];

  if (!user) return { ok: false, error: "User not found" };
  if (!verifyPassword(currentPassword, String(user.password_hash), String(user.password_salt))) {
    return { ok: false, error: "Current password is invalid" };
  }

  const nextRecord = createPasswordRecord(nextPassword);
  const updatedAt = nowIso();

  await client.execute({
    sql: "UPDATE admin_users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?",
    args: [nextRecord.hash, nextRecord.salt, updatedAt, userId]
  });

  await setAuthState("default_credentials_active", "0");
  return { ok: true, username: String(user.username) };
}

export async function createAdminSession(userId) {
  await client.execute({
    sql: "DELETE FROM admin_sessions WHERE expires_at <= ?",
    args: [nowEpochSeconds()]
  });

  const token = randomUUID();
  const createdAt = nowEpochSeconds();
  const expiresAt = createdAt + SESSION_TTL_SECONDS;

  await client.execute({
    sql: "INSERT INTO admin_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [token, userId, createdAt, expiresAt]
  });

  return token;
}

export async function getAdminSession(token) {
  if (!token) return null;

  await client.execute({
    sql: "DELETE FROM admin_sessions WHERE expires_at <= ?",
    args: [nowEpochSeconds()]
  });

  const res = await client.execute({
    sql: `
      SELECT s.token, s.expires_at, u.id AS user_id, u.username
      FROM admin_sessions s
      INNER JOIN admin_users u ON u.id = s.user_id
      WHERE s.token = ?
    `,
    args: [token]
  });
  const row = res.rows[0];

  if (!row) return null;

  return {
    token: String(row.token),
    expiresAt: Number(row.expires_at),
    userId: Number(row.user_id),
    username: String(row.username)
  };
}

export async function deleteAdminSession(token) {
  if (!token) return;
  await client.execute({ sql: "DELETE FROM admin_sessions WHERE token = ?", args: [token] });
}

export async function getAuthInfo() {
  const [userCountRes, primaryAdminRes, authState] = await Promise.all([
    client.execute("SELECT COUNT(*) AS count FROM admin_users"),
    client.execute("SELECT username FROM admin_users ORDER BY id ASC LIMIT 1"),
    getAuthState("default_credentials_active", "0")
  ]);

  return {
    usingDefaultPassword: authState === "1",
    defaultAdminUsername: String(primaryAdminRes.rows[0]?.username || defaultAdminConfig.username),
    adminUserCount: Number(userCountRes.rows[0].count),
    schemaVersion: migrations[migrations.length - 1].version
  };
}
