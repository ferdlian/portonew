async function loadContent() {
  const response = await fetch("/api/content");
  if (!response.ok) {
    throw new Error("Failed to load content");
  }

  return response.json();
}

async function getSession() {
  const response = await fetch("/api/session");
  if (!response.ok) {
    throw new Error("Failed to get session");
  }

  return response.json();
}

async function login(username, password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Login failed");
  }

  return payload;
}

async function logout() {
  const response = await fetch("/api/logout", {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

async function saveContent(payload) {
  const response = await fetch("/api/content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error(result.error || "Failed to save content");
  }

  return result;
}

async function uploadImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename: file.name,
      dataUrl
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error(payload.error || "Upload failed");
  }

  return payload;
}

async function changePassword(currentPassword, nextPassword) {
  const response = await fetch("/api/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ currentPassword, nextPassword })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    throw new Error(payload.error || "Change password failed");
  }

  return payload;
}

async function cleanupUploads() {
  const response = await fetch("/api/uploads/cleanup", {
    method: "POST"
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    throw new Error(payload.error || "Cleanup failed");
  }

  return payload;
}

async function loadDashboardSummary() {
  const response = await fetch("/api/dashboard-summary");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }

    throw new Error(payload.error || "Failed to load dashboard summary");
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getByPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setByPath(object, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => current[key], object);
  target[lastKey] = value;
}

function sectionBlock(id, title, description, content) {
  return `
    <section class="cms-section-card" id="${id}">
      <div class="cms-section-heading">
        <div>
          <p class="eyebrow">Section</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <p>${escapeHtml(description)}</p>
      </div>
      ${content}
    </section>
  `;
}

function renderField(label, path, value, type = "text", placeholder = "", options = {}) {
  if (options.image) {
    return `
      <label class="field field-stack">
        <span>${escapeHtml(label)}</span>
        <div class="image-field">
          <div class="image-preview-wrap">
            <img class="image-preview" src="${escapeHtml(value || "/assets/project-office.svg")}" alt="${escapeHtml(label)}" />
          </div>
          <div class="image-input-group">
            <input data-path="${path}" type="url" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder || "/uploads/namafile.jpg")}" />
            <label class="chip-button upload-button">
              Pilih Gambar
              <input class="image-upload-input" data-upload-path="${path}" type="file" accept="image/*" />
            </label>
          </div>
        </div>
      </label>
    `;
  }

  if (type === "select") {
    const choices = options.options || [];
    const selectOptions = choices
      .map(
        (choice) => `
          <option value="${escapeHtml(choice.value)}" ${String(choice.value) === String(value ?? "") ? "selected" : ""}>
            ${escapeHtml(choice.label)}
          </option>
        `
      )
      .join("");

    return `
      <label class="field">
        <span>${escapeHtml(label)}</span>
        <select data-path="${path}" ${options.previousValue ? `data-prev-value="${escapeHtml(options.previousValue)}"` : ""}>
          ${selectOptions}
        </select>
      </label>
    `;
  }

  const input =
    type === "textarea"
      ? `<textarea data-path="${path}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
      : `<input data-path="${path}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;

  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      ${input}
    </label>
  `;
}

function getProjectOptions() {
  const items = state?.projects?.items || [];
  return [{ value: "", label: "Pilih proyek" }].concat(
    items.map((item) => ({
      value: item.slug,
      label: `${item.name} • ${item.location}`
    }))
  );
}

function getProjectBySlug(slug) {
  return (state?.projects?.items || []).find((item) => item.slug === slug);
}

function ensureCmsStateShape() {
  if (!state || typeof state !== "object") {
    state = {};
  }

  if (!state.projects || typeof state.projects !== "object") {
    state.projects = {};
  }

  if (!Array.isArray(state.projects.items)) {
    state.projects.items = [];
  }

  if (!state.projectProgress || typeof state.projectProgress !== "object") {
    state.projectProgress = {};
  }

  if (typeof state.projectProgress.title !== "string") {
    state.projectProgress.title = "";
  }

  if (typeof state.projectProgress.description !== "string") {
    state.projectProgress.description = "";
  }

  if (!Array.isArray(state.projectProgress.items)) {
    state.projectProgress.items = [];
  }

  if (!state.projectTimeline || typeof state.projectTimeline !== "object") {
    state.projectTimeline = {};
  }

  if (!Array.isArray(state.projectTimeline.items)) {
    state.projectTimeline.items = [];
  }
}

function createProgressItem(project = {}) {
  return {
    projectSlug: project.slug || "",
    title: project.name || "Proyek berjalan baru",
    location: project.location || "Lokasi proyek",
    phase: "Tahap pekerjaan aktif",
    progressPercent: "15",
    targetDate: "April 2026",
    statusTone: "on-track",
    statusLabel: "On track",
    statusNote: "Tulis ringkasan progress utama proyek di sini.",
    updatePointA: "",
    updatePointB: "",
    updatePointC: "",
    image: project.image || "/uploads/project-sample.jpg",
    imageB: project.galleryImageA || project.image || "/uploads/project-sample-detail-a.jpg",
    imageC: project.galleryImageB || project.image || "/uploads/project-sample-detail-b.jpg"
  };
}

function createTimelineItem(projectSlug = "", project = {}) {
  return {
    projectSlug,
    title: "Update timeline baru",
    dateLabel: "Minggu 01",
    note: "Catatan progres terbaru proyek.",
    image: project.image || "/uploads/project-sample.jpg"
  };
}

function getTimelineEntriesByProjectSlug(projectSlug = "") {
  return (state?.projectTimeline?.items || [])
    .map((item, index) => ({ ...item, _index: index }))
    .filter((item) => item.projectSlug === projectSlug);
}

function getProgressItemIndexByProjectSlug(projectSlug = "") {
  return (state?.projectProgress?.items || []).findIndex((item) => item.projectSlug === projectSlug);
}

function syncProgressEditorProjectSlug(preferredSlug = "") {
  const projectSlugs = (state?.projects?.items || []).map((item) => item.slug).filter(Boolean);

  if (preferredSlug && projectSlugs.includes(preferredSlug)) {
    progressEditorProjectSlug = preferredSlug;
    return;
  }

  if (progressEditorProjectSlug && projectSlugs.includes(progressEditorProjectSlug)) {
    return;
  }

  const existingProjectSlug = (state?.projectProgress?.items || [])
    .map((item) => item.projectSlug)
    .find((projectSlug) => projectSlugs.includes(projectSlug));

  progressEditorProjectSlug = existingProjectSlug || projectSlugs[0] || "";
}

function ensureProgressItemForProjectSlug(projectSlug = "") {
  if (!projectSlug) {
    return -1;
  }

  const existingIndex = getProgressItemIndexByProjectSlug(projectSlug);
  if (existingIndex !== -1) {
    return existingIndex;
  }

  const project = getProjectBySlug(projectSlug);
  if (!project) {
    return -1;
  }

  state.projectProgress.items.push(createProgressItem(project));
  return state.projectProgress.items.length - 1;
}

function syncProgressItemProject(index, nextSlug, previousSlug = "") {
  const item = state.projectProgress.items[index];
  const project = getProjectBySlug(nextSlug);
  if (!item || !project) {
    return;
  }

  item.projectSlug = nextSlug;
  item.title = project.name;
  item.location = project.location;
  item.image = item.image || project.image || "";
  item.imageB = item.imageB || project.galleryImageA || project.image || "";
  item.imageC = item.imageC || project.galleryImageB || project.image || "";

  if (previousSlug && previousSlug !== nextSlug) {
    const hasOtherOwner = state.projectProgress.items.some((entry, entryIndex) => entryIndex !== index && entry.projectSlug === previousSlug);
    if (!hasOtherOwner) {
      state.projectTimeline.items.forEach((timelineItem) => {
        if (timelineItem.projectSlug === previousSlug) {
          timelineItem.projectSlug = nextSlug;
        }
      });
    }
  }
}

function renderProjectProgressManager() {
  ensureCmsStateShape();
  syncProgressEditorProjectSlug();
  const projectOptions = getProjectOptions();
  const allProjects = state.projects.items || [];
  const selectedProject = getProjectBySlug(progressEditorProjectSlug);
  const progressIndex = getProgressItemIndexByProjectSlug(progressEditorProjectSlug);
  const progressItem = progressIndex === -1 ? null : state.projectProgress.items[progressIndex];
  const timelineEntries = getTimelineEntriesByProjectSlug(progressEditorProjectSlug);

  const projectShortcutHtml = allProjects
    .map((project) => {
      const isActive = project.slug === progressEditorProjectSlug;
      const hasProgress = getProgressItemIndexByProjectSlug(project.slug) !== -1;

      return `
        <button
          class="progress-project-switch ${isActive ? "is-active" : ""}"
          type="button"
          data-action="select-progress-project"
          data-project-slug="${escapeHtml(project.slug)}"
        >
          <strong>${escapeHtml(project.name)}</strong>
          <span>${escapeHtml(project.location || "Lokasi belum diisi")}</span>
          <small>${hasProgress ? "Progress aktif" : "Belum ada progress"}</small>
        </button>
      `;
    })
    .join("");

  const projectSelector = `
    <label class="field">
      <span>Pilih proyek</span>
      <select data-progress-project-selector="true">
        ${projectOptions
          .map(
            (choice) => `
              <option value="${escapeHtml(choice.value)}" ${String(choice.value) === String(progressEditorProjectSlug) ? "selected" : ""}>
                ${escapeHtml(choice.label)}
              </option>
            `
          )
          .join("")}
      </select>
    </label>
  `;

  let workspaceHtml = `
    <div class="timeline-empty-note progress-empty-state">
      <strong>Belum ada proyek untuk dipilih.</strong>
      <p>Tambahkan proyek dulu di menu Proyek, lalu kembali ke sini untuk mengisi progress dan timeline lapangan.</p>
    </div>
  `;

  if (selectedProject && progressItem) {
    syncProgressItemProject(progressIndex, selectedProject.slug, selectedProject.slug);
    const syncedProgressItem = state.projectProgress.items[progressIndex];
    const statusToneOptions = [
      { value: "on-track", label: "On track" },
      { value: "hampir-handover", label: "Hampir handover" },
      { value: "needs-attention", label: "Perlu perhatian" }
    ];

    const mainFields = [
      renderField("Fase pekerjaan", `projectProgress.items.${progressIndex}.phase`, syncedProgressItem.phase),
      renderField(
        "Persentase progress",
        `projectProgress.items.${progressIndex}.progressPercent`,
        syncedProgressItem.progressPercent,
        "number",
        "0 - 100"
      ),
      renderField("Target handover / update", `projectProgress.items.${progressIndex}.targetDate`, syncedProgressItem.targetDate),
      renderField("Tone status", `projectProgress.items.${progressIndex}.statusTone`, syncedProgressItem.statusTone, "select", "", {
        options: statusToneOptions
      }),
      renderField("Label status", `projectProgress.items.${progressIndex}.statusLabel`, syncedProgressItem.statusLabel)
    ].join("");

    const imageFields = [
      renderField("Gambar progress utama", `projectProgress.items.${progressIndex}.image`, syncedProgressItem.image, "text", "", { image: true }),
      renderField("Gambar progress B", `projectProgress.items.${progressIndex}.imageB`, syncedProgressItem.imageB, "text", "", { image: true }),
      renderField("Gambar progress C", `projectProgress.items.${progressIndex}.imageC`, syncedProgressItem.imageC, "text", "", { image: true })
    ].join("");

    const progressSummaryHtml = `
      <div class="progress-workspace-summary">
        <article class="progress-summary-card">
          <span>Progress aktif</span>
          <strong>${escapeHtml(syncedProgressItem.progressPercent || "0")}%</strong>
        </article>
        <article class="progress-summary-card">
          <span>Fase sekarang</span>
          <strong>${escapeHtml(syncedProgressItem.phase || "Belum diisi")}</strong>
        </article>
        <article class="progress-summary-card">
          <span>Target update</span>
          <strong>${escapeHtml(syncedProgressItem.targetDate || "Belum diisi")}</strong>
        </article>
      </div>
    `;

    const timelineHtml = timelineEntries.length
      ? timelineEntries
          .map(
            (entry, timelineIndex) => `
              <article class="array-card timeline-entry-card" data-array-path="projectTimeline.items" data-index="${entry._index}">
                <div class="array-card-top">
                  <div class="array-card-head">
                    <span class="timeline-entry-index">Update ${String(timelineIndex + 1).padStart(2, "0")}</span>
                    <strong>${escapeHtml(entry.title || `Timeline ${timelineIndex + 1}`)}</strong>
                  </div>
                  <div class="array-card-actions">
                    <button class="chip-button" type="button" data-action="move-timeline-up" data-index="${entry._index}" data-project-slug="${escapeHtml(progressEditorProjectSlug)}">Naik</button>
                    <button class="chip-button" type="button" data-action="move-timeline-down" data-index="${entry._index}" data-project-slug="${escapeHtml(progressEditorProjectSlug)}">Turun</button>
                    <button class="chip-button danger" type="button" data-action="remove-timeline-item" data-index="${entry._index}">Hapus</button>
                  </div>
                </div>
                <div class="timeline-entry-form">
                  <div class="timeline-entry-main">
                    <div class="field-grid timeline-entry-top">
                      ${renderField("Tanggal / minggu", `projectTimeline.items.${entry._index}.dateLabel`, entry.dateLabel)}
                      ${renderField("Judul update", `projectTimeline.items.${entry._index}.title`, entry.title)}
                    </div>
                    <div class="timeline-entry-note">
                      ${renderField("Catatan progress", `projectTimeline.items.${entry._index}.note`, entry.note, "textarea")}
                    </div>
                  </div>
                  <div class="timeline-entry-media">
                    ${renderField("Gambar timeline", `projectTimeline.items.${entry._index}.image`, entry.image, "text", "", { image: true })}
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="timeline-empty-note">Belum ada timeline untuk proyek ini. Tambah update pertama setelah progress utama diisi.</div>`;

    workspaceHtml = `
      <article class="array-card progress-workspace-card">
        <div class="progress-workspace-head">
          <div>
            <p class="eyebrow">Workspace Progress</p>
            <h3>${escapeHtml(selectedProject.name)}</h3>
            <p class="progress-workspace-meta">${escapeHtml(selectedProject.location || "Lokasi belum diisi")} • ${timelineEntries.length} timeline aktif</p>
          </div>
          <div class="array-card-actions">
            <span class="dashboard-chip">${escapeHtml(syncedProgressItem.statusLabel || "Status belum diisi")}</span>
            <button class="chip-button danger" type="button" data-action="remove-progress-item" data-project-slug="${escapeHtml(progressEditorProjectSlug)}">Hapus Progress Proyek</button>
          </div>
        </div>
        ${progressSummaryHtml}

        <section class="progress-stage-card">
          <div class="progress-stage-head">
            <div>
              <strong>1. Progress utama</strong>
              <p>Isi data inti proyek dulu. Nama proyek dan lokasi otomatis mengikuti data dari menu Proyek.</p>
            </div>
          </div>
          <div class="field-grid">${mainFields}</div>
          <div class="progress-note-field">
            ${renderField("Ringkasan progress utama", `projectProgress.items.${progressIndex}.statusNote`, syncedProgressItem.statusNote, "textarea")}
          </div>
        </section>

        <section class="progress-stage-card">
          <div class="progress-stage-head">
            <div>
              <strong>2. Foto progress utama</strong>
              <p>Upload foto utama dan detail pendukung sebelum masuk ke timeline update lapangan.</p>
            </div>
          </div>
          <div class="field-grid">${imageFields}</div>
        </section>

        <section class="progress-stage-card progress-timeline-block">
          <div class="array-toolbar">
            <div>
              <strong>3. Timeline update proyek</strong>
              <p>Tambah catatan perkembangan, tanggal, dan gambar untuk setiap update yang ingin ditampilkan.</p>
            </div>
            <button class="chip-button" type="button" data-action="add-timeline-item" data-project-slug="${escapeHtml(progressEditorProjectSlug)}">Tambah Timeline</button>
          </div>
          <div class="array-list">${timelineHtml}</div>
        </section>
      </article>
    `;
  } else if (selectedProject) {
    workspaceHtml = `
      <div class="timeline-empty-note progress-empty-state">
        <strong>${escapeHtml(selectedProject.name)}</strong>
        <p>Proyek sudah dipilih. Langkah berikutnya buat progress utama dulu, lalu timeline catatan dan upload gambar akan muncul di bawahnya.</p>
        <button class="button primary" type="button" data-action="create-progress-item" data-project-slug="${escapeHtml(selectedProject.slug)}">Mulai Progress Proyek Ini</button>
      </div>
    `;
  }

  return `
    <div class="progress-editor-shell">
      <div class="field-grid">
        ${renderField("Judul section progress", "projectProgress.title", state.projectProgress.title)}
        ${renderField("Deskripsi section progress", "projectProgress.description", state.projectProgress.description, "textarea")}
      </div>
      <div class="array-block progress-picker-card">
        <div class="array-toolbar">
          <div>
            <strong>Flow update progress proyek</strong>
            <p>Urutannya sekarang satu arah: pilih proyek, isi progress utama, lalu tambah timeline lengkap dengan catatan dan upload gambar.</p>
          </div>
        </div>
        <div class="progress-project-picker">
          ${projectSelector}
          <div class="progress-picker-note">
            <strong>${escapeHtml(String(state.projectProgress.items.length))}</strong>
            <span>proyek sedang memakai progress aktif</span>
          </div>
        </div>
        <div class="progress-project-switches">${projectShortcutHtml || '<div class="timeline-empty-note">Belum ada proyek untuk dipilih.</div>'}</div>
      </div>
      <div class="array-list">${workspaceHtml}</div>
    </div>
  `;
}

function renderArrayField(config, items) {
  const rows = (items || [])
    .map((item, index) => {
      const titleField = config.cardTitle ? item[config.cardTitle] : `${config.label} ${index + 1}`;
      const multiUploadHtml = config.multiUpload
        ? `
            <div class="bulk-upload-card">
              <div>
                <strong>${escapeHtml(config.multiUpload.label)}</strong>
                <p>${escapeHtml(config.multiUpload.description)}</p>
              </div>
              <label class="chip-button upload-button">
                Upload Beberapa Gambar
                <input
                  class="bulk-image-upload-input"
                  data-bulk-upload-path="${config.path}.${index}"
                  data-slot-keys="${config.multiUpload.slotKeys.join(",")}"
                  type="file"
                  accept="image/*"
                  multiple
                />
              </label>
            </div>
          `
        : "";
      const fields = config.fields
        .map((field) =>
          renderField(
            field.label,
            `${config.path}.${index}.${field.key}`,
            item[field.key],
            field.type || "text",
            field.placeholder || "",
            field
          )
        )
        .join("");

      return `
        <article class="array-card" draggable="true" data-array-path="${config.path}" data-index="${index}">
          <div class="array-card-top">
            <div class="array-card-head">
              <button class="drag-handle" type="button" aria-label="Geser urutan" title="Geser urutan">⋮⋮</button>
              <strong>${escapeHtml(titleField || `${config.label} ${index + 1}`)}</strong>
            </div>
            <div class="array-card-actions">
              <button class="chip-button" type="button" data-action="move-up" data-path="${config.path}" data-index="${index}">
                Naik
              </button>
              <button class="chip-button" type="button" data-action="move-down" data-path="${config.path}" data-index="${index}">
                Turun
              </button>
              <button class="chip-button danger" type="button" data-action="remove-item" data-path="${config.path}" data-index="${index}">
                Hapus
              </button>
            </div>
          </div>
          ${multiUploadHtml}
          <div class="field-grid">${fields}</div>
        </article>
      `;
    })
    .join("");

  return `
    <div class="array-block">
      <div class="array-toolbar">
        <div>
          <strong>${escapeHtml(config.label)}</strong>
          <p>${escapeHtml(config.description)}</p>
        </div>
        <button class="chip-button" type="button" data-action="add-item" data-path="${config.path}">Tambah Item</button>
      </div>
      <div class="array-list">${rows}</div>
    </div>
  `;
}

const sections = [
  {
    id: "section-brand",
    title: "Brand & CTA",
    description: "Identitas utama website dan kontak awal yang dilihat calon klien.",
    fields: [
      { label: "Nama brand", path: "site.title" },
      { label: "Tagline brand", path: "site.tagline" },
      { label: "Headline hero", path: "hero.headline" },
      { label: "Subjudul hero", path: "hero.eyebrow" },
      { label: "Deskripsi hero", path: "hero.description", type: "textarea" },
      { label: "Background hero", path: "hero.backgroundImage", image: true },
      { label: "Label tombol utama", path: "hero.primaryCta.label" },
      { label: "Link tombol utama", path: "hero.primaryCta.href", placeholder: "#contact" },
      { label: "Label tombol kedua", path: "hero.secondaryCta.label" },
      { label: "Link tombol kedua", path: "hero.secondaryCta.href", placeholder: "#projects" },
      { label: "Judul CTA bawah", path: "cta.title" },
      { label: "Deskripsi CTA bawah", path: "cta.description", type: "textarea" },
      { label: "Label tombol CTA", path: "cta.buttonLabel" },
      { label: "Link tombol CTA", path: "cta.buttonHref", placeholder: "/admin" }
    ]
  },
  {
    id: "section-hero",
    title: "Highlight & Statistik",
    description: "Angka penting dan poin singkat yang menguatkan kepercayaan calon klien.",
    arrays: [
      {
        path: "hero.highlights",
        label: "Highlight Hero",
        description: "Poin singkat di kotak sebelah hero.",
        cardTitle: "label",
        createItem: () => ({ label: "Highlight baru", value: "Isi highlight" }),
        fields: [
          { key: "label", label: "Label" },
          { key: "value", label: "Isi" }
        ]
      },
      {
        path: "stats",
        label: "Statistik",
        description: "Angka performa yang tampil di bawah hero.",
        cardTitle: "value",
        createItem: () => ({ value: "0", label: "Statistik baru" }),
        fields: [
          { key: "value", label: "Angka utama" },
          { key: "label", label: "Keterangan", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-services",
    title: "Layanan",
    description: "Daftar layanan yang ditawarkan perusahaan.",
    fields: [
      { label: "Judul layanan", path: "services.title" },
      { label: "Deskripsi layanan", path: "services.description", type: "textarea" }
    ],
    arrays: [
      {
        path: "services.items",
        label: "Item layanan",
        description: "Tambah atau hapus kartu layanan.",
        cardTitle: "title",
        createItem: () => ({
          title: "Layanan baru",
          description: "Deskripsi layanan baru",
          meta: "Tag layanan"
        }),
        fields: [
          { key: "title", label: "Judul layanan" },
          { key: "meta", label: "Meta/tag" },
          { key: "description", label: "Deskripsi", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-projects",
    title: "Portfolio Proyek",
    description: "Project unggulan beserta foto, kategori, dan ringkasannya.",
    fields: [
      { label: "Judul section proyek", path: "projects.title" },
      { label: "Deskripsi section proyek", path: "projects.description", type: "textarea" }
    ],
    arrays: [
      {
        path: "projects.items",
        label: "Daftar proyek",
        description: "Setiap proyek punya foto utama, isi detail halaman, dan dua foto tambahan.",
        cardTitle: "name",
        createItem: () => ({
          name: "Proyek baru",
          slug: "proyek-baru",
          location: "Lokasi proyek",
          year: "2026",
          category: "Kategori",
          summary: "Ringkasan proyek",
          image: "/uploads/project-sample.jpg",
          client: "Nama klien",
          duration: "12 minggu",
          area: "450 m2",
          scope: "Bangun baru dan interior",
          challenge: "Tantangan utama proyek",
          solution: "Solusi pelaksanaan proyek",
          result: "Hasil akhir proyek",
          galleryImageA: "/uploads/project-sample-detail-a.jpg",
          galleryImageB: "/uploads/project-sample-detail-b.jpg",
          galleryImageC: "/uploads/project-sample-detail-c.jpg",
          floorplanImage: "/uploads/project-floorplan.jpg",
          materialPrimary: "Travertine slab",
          materialSecondary: "American oak veneer",
          materialAccent: "Powder-coated metal bronze",
          materialNotes: "Permainan material dibuat hangat, matte, dan mudah dirawat untuk pemakaian jangka panjang.",
          ctaLabel: "Konsultasikan Proyek Serupa",
          ctaHref: "https://wa.me/6281270004412"
        }),
        multiUpload: {
          label: "Multi Upload Project",
          description: "Upload beberapa foto sekaligus untuk mengisi cover dan galeri detail proyek.",
          slotKeys: ["image", "galleryImageA", "galleryImageB", "galleryImageC"]
        },
        fields: [
          { key: "name", label: "Nama proyek" },
          { key: "slug", label: "Slug URL", placeholder: "proyek-rumah-modern" },
          { key: "location", label: "Lokasi" },
          { key: "year", label: "Tahun" },
          { key: "category", label: "Kategori" },
          { key: "client", label: "Klien" },
          { key: "duration", label: "Durasi" },
          { key: "area", label: "Luas / ukuran" },
          { key: "scope", label: "Scope pekerjaan" },
          { key: "image", label: "Gambar proyek", image: true },
          { key: "galleryImageA", label: "Foto detail A", image: true },
          { key: "galleryImageB", label: "Foto detail B", image: true },
          { key: "galleryImageC", label: "Foto detail C", image: true },
          { key: "floorplanImage", label: "Floorplan / blueprint", image: true },
          { key: "materialPrimary", label: "Material utama" },
          { key: "materialSecondary", label: "Material kedua" },
          { key: "materialAccent", label: "Accent material" },
          { key: "materialNotes", label: "Catatan material", type: "textarea" },
          { key: "ctaLabel", label: "Label CTA project" },
          { key: "ctaHref", label: "Link CTA project", type: "url", placeholder: "https://wa.me/628..." },
          { key: "summary", label: "Ringkasan", type: "textarea" },
          { key: "challenge", label: "Tantangan", type: "textarea" },
          { key: "solution", label: "Solusi", type: "textarea" },
          { key: "result", label: "Hasil", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-project-progress",
    title: "Progress Proyek Berjalan",
    description: "Pilih proyek dulu, lalu isi progress utama dan tambah timeline catatan maupun upload gambar langsung di bawah proyek yang sama.",
    customRender: renderProjectProgressManager
  },
  {
    id: "section-gallery",
    title: "Galeri Foto",
    description: "Dokumentasi hasil kerja untuk memperkuat bukti visual.",
    fields: [
      { label: "Judul galeri", path: "gallery.title" },
      { label: "Deskripsi galeri", path: "gallery.description", type: "textarea" }
    ],
    arrays: [
      {
        path: "gallery.items",
        label: "Foto galeri",
        description: "Setiap item punya judul, detail, dan URL gambar.",
        cardTitle: "title",
        createItem: () => ({
          title: "Foto baru",
          detail: "Detail foto",
          image: "/uploads/project-sample.jpg"
        }),
        fields: [
          { key: "title", label: "Judul foto" },
          { key: "detail", label: "Detail/keterangan" },
          { key: "image", label: "Gambar galeri", image: true }
        ]
      }
    ]
  },
  {
    id: "section-before-after",
    title: "Before / After",
    description: "Tampilkan transformasi renovasi atau fit-out agar lebih meyakinkan.",
    fields: [
      { label: "Judul before / after", path: "beforeAfter.title" },
      { label: "Deskripsi before / after", path: "beforeAfter.description", type: "textarea" }
    ],
    arrays: [
      {
        path: "beforeAfter.items",
        label: "Daftar before / after",
        description: "Pasangkan foto sebelum dan sesudah untuk project tertentu.",
        cardTitle: "title",
        createItem: () => ({
          projectSlug: "proyek-baru",
          title: "Transformasi baru",
          location: "Jakarta",
          summary: "Ringkasan perubahan ruang",
          beforeImage: "/uploads/before-sample.jpg",
          afterImage: "/uploads/after-sample.jpg"
        }),
        fields: [
          { key: "title", label: "Judul" },
          { key: "projectSlug", label: "Slug proyek terkait" },
          { key: "location", label: "Lokasi" },
          { key: "beforeImage", label: "Foto sebelum", image: true },
          { key: "afterImage", label: "Foto sesudah", image: true },
          { key: "summary", label: "Ringkasan perubahan", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-process",
    title: "Proses Kerja",
    description: "Tahapan kerja dari awal sampai serah terima.",
    fields: [{ label: "Judul proses", path: "process.title" }],
    arrays: [
      {
        path: "process.items",
        label: "Tahapan proses",
        description: "Urutan tahap kerja proyek.",
        cardTitle: "title",
        createItem: () => ({
          step: "05",
          title: "Tahap baru",
          description: "Deskripsi tahap baru"
        }),
        fields: [
          { key: "step", label: "Nomor tahap" },
          { key: "title", label: "Judul tahap" },
          { key: "description", label: "Deskripsi", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-testimonials",
    title: "Testimoni Slider",
    description: "Testimoni berjalan otomatis dan bisa menampilkan foto klien serta foto proyek.",
    fields: [
      { label: "Judul testimoni", path: "testimonials.title" },
      { label: "Deskripsi testimoni", path: "testimonials.description", type: "textarea" },
      { label: "Autoplay slider (ms)", path: "testimonials.autoplayMs" }
    ],
    arrays: [
      {
        path: "testimonials.items",
        label: "Daftar testimoni",
        description: "Tampilkan quote, nama, foto klien, dan foto proyek terkait.",
        cardTitle: "name",
        createItem: () => ({
          quote: "Testimoni baru",
          name: "Nama klien",
          role: "Jabatan klien",
          avatar: "/uploads/avatar-sample.jpg",
          projectName: "Nama proyek",
          projectImage: "/uploads/project-sample.jpg"
        }),
        fields: [
          { key: "name", label: "Nama klien" },
          { key: "role", label: "Posisi / jabatan" },
          { key: "avatar", label: "Foto klien", image: true },
          { key: "projectName", label: "Nama proyek" },
          { key: "projectImage", label: "Foto proyek", image: true },
          { key: "quote", label: "Isi testimoni", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "section-contact",
    title: "Kontak & Footer",
    description: "Informasi kontak yang dipakai untuk penawaran dan konsultasi awal.",
    fields: [
      { label: "Judul kontak", path: "contact.title" },
      { label: "Deskripsi kontak", path: "contact.description", type: "textarea" },
      { label: "Email", path: "contact.email", type: "email" },
      { label: "Telepon", path: "contact.phone", type: "tel" },
      { label: "Alamat", path: "contact.address" },
      { label: "Jam operasional", path: "contact.hours" },
      { label: "Link WhatsApp", path: "contact.whatsapp", type: "url", placeholder: "https://wa.me/628..." },
      { label: "Footer copyright", path: "footer.copyright" }
    ]
  }
];

const saveButton = document.getElementById("save-button");
const logoutButton = document.getElementById("logout-button");
const sectionsNode = document.getElementById("cms-sections");
const statusNode = document.getElementById("save-status");
const adminSidebar = document.querySelector(".admin-sidebar");
const authPanel = document.getElementById("auth-panel");
const loginForm = document.getElementById("login-form");
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginStatus = document.getElementById("login-status");
const defaultPasswordNote = document.getElementById("default-password-note");
const dashboardSummary = document.getElementById("dashboard-summary");
const dashboardMetrics = document.getElementById("dashboard-metrics");
const dashboardQuickLinks = document.getElementById("dashboard-quick-links");
const dashboardStatus = document.getElementById("dashboard-status");
const dashboardSystemChip = document.getElementById("dashboard-system-chip");
const passwordForm = document.getElementById("password-form");
const passwordCurrent = document.getElementById("password-current");
const passwordNext = document.getElementById("password-next");
const passwordConfirm = document.getElementById("password-confirm");
const passwordStatus = document.getElementById("password-status");
const cleanupUploadsButton = document.getElementById("cleanup-uploads");
const previewFrame = document.getElementById("site-preview");
const refreshPreviewButton = document.getElementById("refresh-preview");
const editorDirtyChip = document.getElementById("editor-dirty-chip");
const editorSectionCount = document.getElementById("editor-section-count");
const sidebarNavLinks = Array.from(document.querySelectorAll(".editor-nav a"));
let state;
let authenticated = false;
let dragState = null;
let dashboardState = null;
let hasUnsavedChanges = false;
let saveInFlight = false;
let sectionObserver;
let activeSectionId = "section-dashboard";
let progressEditorProjectSlug = "";
let pendingFocusPath = "";

function resolveSectionId(sectionId = "") {
  const allowedIds = new Set(["section-dashboard", ...sections.map((section) => section.id), "section-account"]);
  return allowedIds.has(sectionId) ? sectionId : "section-dashboard";
}

function getActiveSectionLabel() {
  if (activeSectionId === "section-dashboard") {
    return "Dashboard";
  }

  if (activeSectionId === "section-account") {
    return "Akun Admin";
  }

  return sections.find((section) => section.id === activeSectionId)?.title || "Section";
}

function setActiveSidebarLink(sectionId = "") {
  const activeHref = sectionId ? `#${sectionId}` : "";
  sidebarNavLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === activeHref);
  });
}

function updateEditorChrome() {
  if (editorSectionCount) {
    editorSectionCount.textContent = authenticated ? getActiveSectionLabel() : "0 section";
  }

  if (editorDirtyChip) {
    editorDirtyChip.classList.remove("ok", "warn");

    if (!authenticated) {
      editorDirtyChip.textContent = "Login untuk mulai edit";
    } else if (saveInFlight) {
      editorDirtyChip.textContent = "Menyimpan perubahan...";
    } else if (hasUnsavedChanges) {
      editorDirtyChip.textContent = "Perubahan belum disimpan";
      editorDirtyChip.classList.add("warn");
    } else {
      editorDirtyChip.textContent = "Tidak ada perubahan";
      editorDirtyChip.classList.add("ok");
    }
  }

  if (saveButton) {
    saveButton.disabled = !authenticated || saveInFlight || !hasUnsavedChanges;
    saveButton.textContent = saveInFlight ? "Menyimpan..." : hasUnsavedChanges ? "Simpan Perubahan" : "Semua Tersimpan";
  }
}

function setDirtyState(nextValue) {
  hasUnsavedChanges = nextValue;
  updateEditorChrome();
}

function setSaveInFlight(nextValue) {
  saveInFlight = nextValue;
  updateEditorChrome();
}

function bindSectionObserver() {
  sectionObserver?.disconnect();
  setActiveSidebarLink(activeSectionId);
  updateEditorChrome();

  if (pendingFocusPath) {
    requestAnimationFrame(() => {
      const targetField = sectionsNode.querySelector(`[data-path="${CSS.escape(pendingFocusPath)}"]`);
      if (!targetField) {
        pendingFocusPath = "";
        return;
      }

      targetField.focus();
      targetField.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingFocusPath = "";
    });
  }
}

function setAuthenticated(nextValue, session = {}) {
  authenticated = nextValue;
  adminSidebar.hidden = !nextValue;
  dashboardSummary.hidden = true;
  authPanel.hidden = nextValue;
  sectionsNode.hidden = !nextValue;
  saveButton.hidden = !nextValue;
  cleanupUploadsButton.hidden = !nextValue;
  logoutButton.hidden = !nextValue;
  statusNode.hidden = !nextValue;
  passwordForm.closest(".account-card").hidden = true;
  defaultPasswordNote.hidden = !session.usingDefaultPassword;

  if (session.usingDefaultPassword) {
    defaultPasswordNote.textContent = `Server masih memakai kredensial default. Username: ${session.defaultAdminUsername || "admin"}. Disarankan ganti ADMIN_USERNAME dan ADMIN_PASSWORD.`;
  }

  if (!nextValue) {
    setActiveSidebarLink("");
  }

  updateEditorChrome();
}

function renderDashboardSummary(summary) {
  dashboardState = summary;

  dashboardSystemChip.innerHTML = `
    <span class="dashboard-chip ${summary.unusedUploadCount > 0 ? "warn" : "ok"}">
      ${summary.unusedUploadCount > 0 ? "Perlu cleanup" : "Bersih"}
    </span>
    <span class="dashboard-chip">${summary.uploadCount} upload</span>
    <span class="dashboard-chip">${formatBytes(summary.uploadBytes)} storage</span>
    <span class="dashboard-chip">schema v${summary.schemaVersion}</span>
  `;

  dashboardMetrics.innerHTML = [
    { label: "Projects", value: summary.projectsCount, hint: "item aktif" },
    { label: "Progress", value: summary.projectProgressCount || 0, hint: "proyek berjalan" },
    { label: "Timeline", value: summary.projectTimelineCount || 0, hint: "update detail" },
    { label: "Gallery", value: summary.galleryCount, hint: "foto portfolio" },
    { label: "Testimonials", value: summary.testimonialsCount, hint: "slide klien" },
    { label: "Before / After", value: summary.beforeAfterCount, hint: "transformasi" },
    { label: "Uploads", value: summary.uploadCount, hint: `${summary.referencedUploadCount} dipakai` },
    { label: "Storage", value: formatBytes(summary.uploadBytes), hint: "total folder uploads" },
    { label: "Unused estimate", value: summary.unusedUploadCount, hint: "siap dibersihkan" }
  ]
    .map(
      (item) => `
        <article class="dashboard-metric">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.hint)}</small>
        </article>
      `
    )
    .join("");

  dashboardQuickLinks.innerHTML = summary.quickLinks
    .map(
      (item) => `
        <a class="dashboard-link" href="${escapeHtml(item.href)}">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.hint)}</span>
        </a>
      `
    )
    .join("");

  dashboardStatus.innerHTML = summary.systemStatus
    .map(
      (item) => `
        <div class="dashboard-status-row">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");
}

async function refreshDashboardSummary() {
  if (!authenticated) return;

  const summary = await loadDashboardSummary();
  renderDashboardSummary(summary);
  dashboardSummary.hidden = activeSectionId !== "section-dashboard";
}

function pushPreview() {
  if (!previewFrame?.contentWindow || !state) return;
  previewFrame.contentWindow.postMessage(
    {
      type: "cms-preview",
      payload: state
    },
    window.location.origin
  );
}

function reloadPreview() {
  if (!previewFrame) return;
  previewFrame.src = `/?preview=1&t=${Date.now()}`;
}

function renderSections() {
  ensureCmsStateShape();
  const accountCard = passwordForm.closest(".account-card");
  const isAccountSection = activeSectionId === "section-account";
  const isDashboardSection = activeSectionId === "section-dashboard";
  const section = sections.find((item) => item.id === activeSectionId);

  dashboardSummary.hidden = !authenticated || !isDashboardSection;
  sectionsNode.hidden = isAccountSection || isDashboardSection || !authenticated;
  accountCard.hidden = !authenticated || !isAccountSection;

  if (isDashboardSection || !section || isAccountSection) {
    sectionsNode.innerHTML = "";
    bindSectionObserver();
    return;
  }

  if (section.customRender) {
    sectionsNode.innerHTML = sectionBlock(section.id, section.title, section.description, section.customRender(section));
    bindSectionObserver();
    return;
  }

  const fieldsHtml = (section.fields || [])
    .map((field) => renderField(field.label, field.path, getByPath(state, field.path), field.type, field.placeholder, field))
    .join("");

  const arraysHtml = (section.arrays || []).map((config) => renderArrayField(config, getByPath(state, config.path))).join("");

  sectionsNode.innerHTML = sectionBlock(
    section.id,
    section.title,
    section.description,
    `<div class="field-grid">${fieldsHtml}</div>${arraysHtml}`
  );

  bindSectionObserver();
}

function selectSection(sectionId, { updateHash = true } = {}) {
  activeSectionId = resolveSectionId(sectionId);
  setActiveSidebarLink(activeSectionId);
  dashboardSummary.hidden = activeSectionId !== "section-dashboard";

  if (updateHash) {
    window.history.replaceState(null, "", `#${activeSectionId}`);
  }

  if (authenticated && state) {
    renderSections();
  } else {
    updateEditorChrome();
  }
}

function findArrayConfig(path) {
  for (const section of sections) {
    for (const arrayConfig of section.arrays || []) {
      if (arrayConfig.path === path) {
        return arrayConfig;
      }
    }
  }

  return null;
}

sectionsNode.addEventListener("input", (event) => {
  ensureCmsStateShape();
  const field = event.target.closest("[data-path]");
  if (!field) return;
  setByPath(state, field.dataset.path, field.value);
  setDirtyState(true);
  pushPreview();
});

sectionsNode.addEventListener("change", async (event) => {
  ensureCmsStateShape();
  const progressProjectSelector = event.target.closest("[data-progress-project-selector]");
  if (progressProjectSelector) {
    syncProgressEditorProjectSlug(progressProjectSelector.value);
    renderSections();
    return;
  }

  const field = event.target.closest("[data-path]");
  if (field?.matches("select[data-path]")) {
    const progressMatch = field.dataset.path.match(/^projectProgress\.items\.(\d+)\.projectSlug$/);
    if (progressMatch) {
      const index = Number(progressMatch[1]);
      syncProgressItemProject(index, field.value, field.dataset.prevValue || "");
      renderSections();
      setDirtyState(true);
      pushPreview();
      field.dataset.prevValue = field.value;
      return;
    }
  }

  const input = event.target.closest(".image-upload-input");
  const bulkInput = event.target.closest(".bulk-image-upload-input");

  if (bulkInput?.files?.length) {
    statusNode.textContent = "Mengunggah beberapa gambar proyek...";

    try {
      const target = getByPath(state, bulkInput.dataset.bulkUploadPath);
      const slotKeys = bulkInput.dataset.slotKeys.split(",").filter(Boolean);
      const files = Array.from(bulkInput.files).slice(0, slotKeys.length);
      const uploads = await Promise.all(files.map((file) => uploadImage(file)));

      uploads.forEach((result, index) => {
        target[slotKeys[index]] = result.url;
      });

      renderSections();
      setDirtyState(true);
      pushPreview();
      await refreshDashboardSummary();
      statusNode.textContent = "Beberapa gambar proyek berhasil diunggah.";
    } catch (error) {
      if (error.message === "Unauthorized") {
        setAuthenticated(false, {});
        statusNode.textContent = "Session habis. Login lagi untuk upload gambar.";
        return;
      }

      statusNode.textContent = "Multi upload gambar gagal.";
    }
    return;
  }

  if (!input || !input.files?.[0]) return;

  statusNode.textContent = "Mengunggah gambar...";

  try {
    const result = await uploadImage(input.files[0]);
    setByPath(state, input.dataset.uploadPath, result.url);
    renderSections();
    setDirtyState(true);
    pushPreview();
    await refreshDashboardSummary();
    statusNode.textContent = "Gambar berhasil diunggah.";
  } catch (error) {
    if (error.message === "Unauthorized") {
      setAuthenticated(false, {});
      statusNode.textContent = "Session habis. Login lagi untuk upload gambar.";
      return;
    }

    statusNode.textContent = "Upload gambar gagal.";
  }
});

sectionsNode.addEventListener("click", (event) => {
  ensureCmsStateShape();
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "select-progress-project") {
    syncProgressEditorProjectSlug(button.dataset.projectSlug || "");
    renderSections();
    return;
  }

  if (action === "create-progress-item") {
    const projectSlug = button.dataset.projectSlug || progressEditorProjectSlug;
    const progressIndex = ensureProgressItemForProjectSlug(projectSlug);
    if (progressIndex === -1) {
      statusNode.textContent = "Pilih proyek yang valid dulu sebelum membuat progress.";
      return;
    }

    syncProgressEditorProjectSlug(projectSlug);
    pendingFocusPath = `projectProgress.items.${progressIndex}.phase`;
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    statusNode.textContent = "Progress proyek dibuat. Lanjut isi fase pekerjaan dan target update.";
    return;
  }

  if (action === "add-progress-item") {
    state.projectProgress.items.push(createProgressItem());
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "move-progress-up" && Number(button.dataset.index) > 0) {
    const index = Number(button.dataset.index);
    const array = state.projectProgress.items;
    [array[index - 1], array[index]] = [array[index], array[index - 1]];
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "move-progress-down" && Number(button.dataset.index) < state.projectProgress.items.length - 1) {
    const index = Number(button.dataset.index);
    const array = state.projectProgress.items;
    [array[index + 1], array[index]] = [array[index], array[index + 1]];
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "remove-progress-item") {
    const index = Number.isFinite(Number(button.dataset.index))
      ? Number(button.dataset.index)
      : getProgressItemIndexByProjectSlug(button.dataset.projectSlug || progressEditorProjectSlug);
    if (index < 0) {
      return;
    }
    const removed = state.projectProgress.items.splice(index, 1)[0];
    if (removed?.projectSlug) {
      state.projectTimeline.items = state.projectTimeline.items.filter((item) => item.projectSlug !== removed.projectSlug);
    }
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "add-timeline-item") {
    const projectSlug = button.dataset.projectSlug || progressEditorProjectSlug;
    const progressIndex = ensureProgressItemForProjectSlug(projectSlug);
    const progressItem = state.projectProgress.items[progressIndex];
    const project = getProjectBySlug(progressItem?.projectSlug);
    if (!progressItem?.projectSlug) {
      statusNode.textContent = "Pilih proyek dulu sebelum menambah timeline.";
      return;
    }
    state.projectTimeline.items.push(createTimelineItem(progressItem.projectSlug, project));
    pendingFocusPath = `projectTimeline.items.${state.projectTimeline.items.length - 1}.dateLabel`;
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    statusNode.textContent = "Timeline baru ditambahkan. Lengkapi tanggal, judul, catatan, lalu upload gambarnya.";
    return;
  }

  if (action === "remove-timeline-item") {
    state.projectTimeline.items.splice(Number(button.dataset.index), 1);
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "move-timeline-up" || action === "move-timeline-down") {
    const globalIndex = Number(button.dataset.index);
    const projectSlug = button.dataset.projectSlug;
    const matchingIndexes = state.projectTimeline.items
      .map((item, index) => ({ slug: item.projectSlug, index }))
      .filter((item) => item.slug === projectSlug)
      .map((item) => item.index);
    const currentPosition = matchingIndexes.indexOf(globalIndex);
    const targetPosition = action === "move-timeline-up" ? currentPosition - 1 : currentPosition + 1;

    if (currentPosition === -1 || targetPosition < 0 || targetPosition >= matchingIndexes.length) {
      return;
    }

    const swapIndex = matchingIndexes[targetPosition];
    [state.projectTimeline.items[globalIndex], state.projectTimeline.items[swapIndex]] = [
      state.projectTimeline.items[swapIndex],
      state.projectTimeline.items[globalIndex]
    ];
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  const path = button.dataset.path;
  const config = findArrayConfig(path);
  if (!config) return;

  const array = getByPath(state, path);

  if (action === "add-item") {
    array.push(config.createItem());
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "move-up" && Number(button.dataset.index) > 0) {
    const currentIndex = Number(button.dataset.index);
    [array[currentIndex - 1], array[currentIndex]] = [array[currentIndex], array[currentIndex - 1]];
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "move-down" && Number(button.dataset.index) < array.length - 1) {
    const currentIndex = Number(button.dataset.index);
    [array[currentIndex + 1], array[currentIndex]] = [array[currentIndex], array[currentIndex + 1]];
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
    return;
  }

  if (action === "remove-item") {
    array.splice(Number(button.dataset.index), 1);
    renderSections();
    setDirtyState(true);
    pushPreview();
    refreshDashboardSummary().catch(() => {});
  }
});

sectionsNode.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".array-card");
  if (!card) return;

  dragState = {
    path: card.dataset.arrayPath,
    index: Number(card.dataset.index)
  };

  card.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
});

sectionsNode.addEventListener("dragover", (event) => {
  const card = event.target.closest(".array-card");
  if (!card || !dragState || card.dataset.arrayPath !== dragState.path) return;
  event.preventDefault();
  card.classList.add("is-drop-target");
});

sectionsNode.addEventListener("dragleave", (event) => {
  const card = event.target.closest(".array-card");
  if (!card) return;
  card.classList.remove("is-drop-target");
});

sectionsNode.addEventListener("dragend", () => {
  dragState = null;
  sectionsNode.querySelectorAll(".array-card").forEach((card) => {
    card.classList.remove("is-dragging", "is-drop-target");
  });
});

sectionsNode.addEventListener("drop", (event) => {
  const card = event.target.closest(".array-card");
  if (!card || !dragState || card.dataset.arrayPath !== dragState.path) return;

  event.preventDefault();
  const array = getByPath(state, dragState.path);
  const targetIndex = Number(card.dataset.index);
  const [moved] = array.splice(dragState.index, 1);
  array.splice(targetIndex, 0, moved);
  dragState = null;
  renderSections();
  setDirtyState(true);
  pushPreview();
  refreshDashboardSummary().catch(() => {});
});

saveButton.addEventListener("click", async () => {
  if (!authenticated) {
    statusNode.textContent = "Login dulu sebelum menyimpan perubahan.";
    return;
  }

  statusNode.textContent = "Menyimpan perubahan...";
  setSaveInFlight(true);

  try {
    await saveContent(state);
    setDirtyState(false);
    reloadPreview();
    await refreshDashboardSummary();
    statusNode.textContent = "Perubahan tersimpan. Refresh halaman website untuk melihat update.";
  } catch (error) {
    if (error.message === "Unauthorized") {
      setAuthenticated(false, {});
      statusNode.textContent = "Session habis. Login lagi sebelum menyimpan.";
      setSaveInFlight(false);
      return;
    }

    statusNode.textContent = error.message || "Gagal menyimpan perubahan.";
  }

  setSaveInFlight(false);
});

logoutButton.addEventListener("click", async () => {
  try {
    await logout();
    setAuthenticated(false, {});
    setDirtyState(false);
    loginPassword.value = "";
    loginStatus.textContent = "Kamu sudah logout dari CMS.";
  } catch (error) {
    statusNode.textContent = "Logout gagal.";
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (passwordNext.value.length < 8) {
    passwordStatus.textContent = "Password baru minimal 8 karakter.";
    return;
  }

  if (passwordNext.value !== passwordConfirm.value) {
    passwordStatus.textContent = "Konfirmasi password baru tidak sama.";
    return;
  }

  passwordStatus.textContent = "Menyimpan password baru...";

  try {
    await changePassword(passwordCurrent.value, passwordNext.value);
    passwordCurrent.value = "";
    passwordNext.value = "";
    passwordConfirm.value = "";
    passwordStatus.textContent = "Password admin berhasil diganti.";
  } catch (error) {
    if (error.message === "Unauthorized") {
      setAuthenticated(false, {});
      passwordStatus.textContent = "Session habis. Login lagi untuk ganti password.";
      return;
    }

    passwordStatus.textContent = error.message || "Gagal mengganti password.";
  }
});

cleanupUploadsButton.addEventListener("click", async () => {
  statusNode.textContent = "Membersihkan file upload yang tidak dipakai...";

  try {
    const result = await cleanupUploads();
    await refreshDashboardSummary();
    statusNode.textContent = `Cleanup selesai. ${result.deletedCount} file dihapus, ${result.skippedCount || 0} file baru dilewati demi keamanan.`;
  } catch (error) {
    if (error.message === "Unauthorized") {
      setAuthenticated(false, {});
      statusNode.textContent = "Session habis. Login lagi untuk cleanup uploads.";
      return;
    }

    statusNode.textContent = "Cleanup uploads gagal.";
  }
});

sidebarNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const href = link.getAttribute("href") || "";
    selectSection(href.replace(/^#/, ""));
  });
});

window.addEventListener("hashchange", () => {
  selectSection(window.location.hash.replace(/^#/, ""), { updateHash: false });
});

refreshPreviewButton?.addEventListener("click", () => {
  reloadPreview();
});

window.addEventListener("keydown", (event) => {
  const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
  if (!isSaveShortcut || !authenticated || saveInFlight || !hasUnsavedChanges) {
    return;
  }

  event.preventDefault();
  saveButton.click();
});

previewFrame?.addEventListener("load", () => {
  pushPreview();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Memeriksa kredensial...";

  try {
    const session = await login(loginUsername.value, loginPassword.value);
    state = await loadContent();
    ensureCmsStateShape();
    setAuthenticated(true, session);
    selectSection(window.location.hash.replace(/^#/, ""), { updateHash: false });
    setDirtyState(false);
    await refreshDashboardSummary();
    loginPassword.value = "";
    loginStatus.textContent = "";
    statusNode.textContent = "Login berhasil.";
  } catch (error) {
    loginStatus.textContent =
      error.message === "Invalid password" ? "Username atau password salah." : error.message || "Login gagal.";
  }
});

async function init() {
  const session = await getSession();
  loginUsername.value = session.defaultAdminUsername || "admin";
  activeSectionId = resolveSectionId(window.location.hash.replace(/^#/, ""));
  setAuthenticated(session.authenticated, session);

  if (!session.authenticated) {
    return;
  }

  state = await loadContent();
  ensureCmsStateShape();
  selectSection(activeSectionId, { updateHash: false });
  setDirtyState(false);
  await refreshDashboardSummary();
}

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});

init().catch(() => {
  statusNode.textContent = "Konten gagal dimuat dari server.";
});
