async function loadContent() {
  const response = await fetch("/api/content");
  if (!response.ok) {
    throw new Error("Failed to load content");
  }

  return response.json();
}

function initRevealAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  document.querySelectorAll(".reveal").forEach((node, index) => {
    node.style.setProperty("--reveal-delay", `${Math.min(index * 35, 220)}ms`);
    observer.observe(node);
  });
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

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value ?? "";
}

function setSectionVisibility(id, visible) {
  const node = document.getElementById(id);
  if (node) {
    node.hidden = !visible;
  }
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProgressValue(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/%$/, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeProgressTone(value) {
  const tone = String(value ?? "")
    .trim()
    .toLowerCase();

  if (tone === "near-handover" || tone === "hampir-handover") {
    return "near-handover";
  }

  if (tone === "attention" || tone === "needs-attention") {
    return "attention";
  }

  return "on-track";
}

function getSelectedProject(content) {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const projects = content.projects?.items || [];
  const selected = projects.find((item) => (item.slug || slugify(item.name)) === slug);

  if (slug && !selected) {
    return {
      slug,
      project: null
    };
  }

  const fallbackProject = selected || projects[0];

  return {
    slug: fallbackProject?.slug || slugify(fallbackProject?.name),
    project: fallbackProject
  };
}

function renderMeta(project) {
  const node = document.getElementById("detail-meta");
  const items = [
    { label: "Lokasi", value: project.location },
    { label: "Tahun", value: project.year },
    { label: "Klien", value: project.client },
    { label: "Durasi", value: project.duration },
    { label: "Luas", value: project.area },
    { label: "Scope", value: project.scope }
  ].filter((item) => item.value);

  node.innerHTML = items
    .map(
      (item) => `
        <article class="detail-meta-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderMaterials(project) {
  const node = document.getElementById("detail-materials");
  const items = [
    { label: "Primary", value: project.materialPrimary },
    { label: "Secondary", value: project.materialSecondary },
    { label: "Accent", value: project.materialAccent }
  ].filter((item) => item.value);

  node.innerHTML = items
    .map(
      (item) => `
        <article class="detail-meta-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderGallery(project) {
  const node = document.getElementById("detail-gallery");
  const images = [
    project.image,
    project.galleryImageA || project.image,
    project.galleryImageB || project.image,
    project.galleryImageC || project.galleryImageB || project.image
  ].filter(Boolean);

  node.innerHTML = images
    .map(
      (image, index) => `
        <figure class="detail-gallery-card ${index === 0 ? "is-featured" : ""}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(project.name)}" />
        </figure>
      `
    )
    .join("");
}

function renderProjectProgress(content, project) {
  const match = (content.projectProgress?.items || []).find((item) => item.projectSlug === project.slug);
  const section = document.getElementById("detail-progress-section");
  const card = document.getElementById("detail-progress-card");

  if (!section || !card) {
    return;
  }

  if (!match) {
    setSectionVisibility("detail-progress-section", false);
    card.innerHTML = "";
    return;
  }

  setSectionVisibility("detail-progress-section", true);

  const percent = normalizeProgressValue(match.progressPercent);
  const tone = normalizeProgressTone(match.statusTone);
  const progressImages = [match.image || project.image, match.imageB, match.imageC].filter(Boolean);
  const timelineEntries = (content.projectTimeline?.items || []).filter((item) => item.projectSlug === project.slug);
  const fallbackTimeline = [match.updatePointA, match.updatePointB, match.updatePointC]
    .filter(Boolean)
    .map((note, index) => ({
      title: `Update ${index + 1}`,
      dateLabel: `Tahap ${String(index + 1).padStart(2, "0")}`,
      note,
      image: progressImages[index] || progressImages[0]
    }));
  const baseTimeline = timelineEntries.length > 0 ? timelineEntries : fallbackTimeline;
  const timeline =
    baseTimeline.length > 0
      ? baseTimeline
      : [
          {
            title: match.phase || "Progress berjalan",
            dateLabel: match.targetDate || "Update terbaru",
            note: match.statusNote || "Tim sedang menyiapkan update lapangan terbaru untuk proyek ini.",
            image: match.image || project.image
          }
        ];
  const stageItems = timeline
    .map((entry, index) => ({
      ...entry,
      state: index === timeline.length - 1 ? "active" : "complete"
    }))
    .concat({
      title: "Update berikutnya",
      dateLabel: "Menunggu update baru",
      note: "Timeline berikutnya akan muncul di sini setelah tim menambahkan catatan progres dan foto lapangan terbaru dari CMS.",
      image: "",
      state: "upcoming",
      placeholder: true
    });
  const currentStage = timeline[timeline.length - 1] || match;
  setText("detail-progress-title", `Update terbaru ${match.title || project.name}`);
  setText(
    "detail-progress-summary",
    "Pantau fase yang sedang dikerjakan, target handover, dan catatan terakhir dari tim pelaksana."
  );

  card.innerHTML = `
    <div class="detail-progress-overview detail-progress-overview--${tone}">
      <div class="detail-progress-overview-copy">
        <div class="detail-progress-header">
          <div>
            <p class="service-meta">${escapeHtml(match.phase)}</p>
            <h3>${escapeHtml(match.title || project.name)}</h3>
            <p class="project-location">${escapeHtml(match.location || project.location)}</p>
          </div>
          <div class="detail-progress-badge-wrap">
            <span class="detail-progress-status detail-progress-status--${tone}">${escapeHtml(match.statusLabel || "On track")}</span>
            <span class="detail-progress-badge">${percent}%</span>
          </div>
        </div>
        <div class="detail-progress-bar" aria-hidden="true">
          <span style="width: ${percent}%"></span>
        </div>
        <div class="detail-progress-meta">
          <article class="detail-meta-card">
            <span>Fase aktif</span>
            <strong>${escapeHtml(match.phase)}</strong>
          </article>
          <article class="detail-meta-card">
            <span>Target update</span>
            <strong>${escapeHtml(match.targetDate)}</strong>
          </article>
          <article class="detail-meta-card">
            <span>Status saat ini</span>
            <strong>${escapeHtml(`${percent}% selesai`)}</strong>
          </article>
        </div>
        <p class="section-description">${escapeHtml(match.statusNote)}</p>
        <div class="detail-progress-current-note">
          <strong>${escapeHtml(currentStage.title || "Update terbaru")}</strong>
          <p>${escapeHtml(currentStage.note || match.statusNote || "")}</p>
        </div>
      </div>
      <div class="detail-progress-overview-media detail-progress-overview-media--${tone}">
        <img class="detail-progress-image" src="${escapeHtml(match.image || project.image)}" alt="${escapeHtml(match.title || project.name)}" />
      </div>
    </div>
    <div class="detail-progress-stepper" role="list">
      ${stageItems
        .map(
          (entry, index) => `
            <article class="detail-progress-stepper-item is-${escapeHtml(entry.state)}" role="listitem">
              <div class="detail-progress-stepper-node">${entry.state === "complete" ? "✓" : String(index + 1).padStart(2, "0")}</div>
              <div class="detail-progress-stepper-copy">
                <strong>${escapeHtml(entry.title || `Tahap ${index + 1}`)}</strong>
                <small>${escapeHtml(entry.dateLabel || "Update terbaru")}</small>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
    <div class="detail-progress-stage-grid">
      ${stageItems
        .map(
          (entry, index) => `
            <article class="detail-progress-stage-card is-${escapeHtml(entry.state)} ${entry.placeholder ? "is-placeholder" : ""}">
              <div class="detail-progress-stage-top">
                <span class="detail-progress-step">${String(index + 1).padStart(2, "0")}</span>
                <div class="detail-progress-stage-copy">
                  <small>${escapeHtml(entry.dateLabel || "Update terbaru")}</small>
                  <strong>${escapeHtml(entry.title || `Update ${index + 1}`)}</strong>
                </div>
              </div>
              <p>${escapeHtml(entry.note || "")}</p>
              ${
                entry.image
                  ? `<div class="detail-progress-stage-media"><img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title || `Timeline ${index + 1}`)}" /></div>`
                  : `<div class="detail-progress-stage-placeholder" aria-hidden="true"></div>`
              }
            </article>
          `
        )
        .join("")}
    </div>
    ${
      timelineEntries.length === 0
        ? `<div class="detail-progress-gallery">
            ${progressImages
              .map(
                (image, index) => `
                  <figure class="detail-progress-gallery-card ${index === 0 ? "is-featured" : ""}">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(`${match.title || project.name} progress ${index + 1}`)}" />
                  </figure>
                `
              )
              .join("")}
          </div>`
        : ""
    }
  `;
}

function renderBeforeAfter(content, projectSlug) {
  const match = (content.beforeAfter?.items || []).find((item) => item.projectSlug === projectSlug);
  const section = document.getElementById("detail-before-after-section");
  if (!match) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  setText("detail-before-after-title", match.title);
  setText("detail-before-after-summary", match.summary);
  document.getElementById("detail-before-after-grid").innerHTML = `
    <figure class="compare-pane">
      <img class="compare-image" src="${escapeHtml(match.beforeImage)}" alt="Before ${escapeHtml(match.title)}" />
      <figcaption>Before</figcaption>
    </figure>
    <figure class="compare-pane">
      <img class="compare-image" src="${escapeHtml(match.afterImage)}" alt="After ${escapeHtml(match.title)}" />
      <figcaption>After</figcaption>
    </figure>
  `;
}

function renderTestimonial(content, project) {
  const node = document.getElementById("detail-testimonial");
  const match = (content.testimonials?.items || []).find((item) => item.projectName === project.name);

  if (!match) {
    node.innerHTML = `
      <article class="testimonial-slide">
        <div class="testimonial-content">
          <p class="testimonial-quote">"${escapeHtml(project.result || project.summary)}"</p>
        </div>
      </article>
    `;
    return;
  }

  node.innerHTML = `
    <article class="testimonial-slide">
      <div class="testimonial-content">
        <div class="testimonial-client">
          <img class="testimonial-avatar" src="${escapeHtml(match.avatar)}" alt="${escapeHtml(match.name)}" />
          <div>
            <strong>${escapeHtml(match.name)}</strong>
            <span>${escapeHtml(match.role)}</span>
          </div>
        </div>
        <p class="testimonial-quote">"${escapeHtml(match.quote)}"</p>
      </div>
      <div class="testimonial-project">
        <img class="testimonial-project-image" src="${escapeHtml(match.projectImage)}" alt="${escapeHtml(match.projectName)}" />
        <div class="testimonial-project-copy">
          <span>Proyek Terkait</span>
          <strong>${escapeHtml(match.projectName)}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderRelatedProjects(content, currentSlug) {
  const node = document.getElementById("detail-related-projects");
  const related = (content.projects?.items || [])
    .filter((item) => (item.slug || slugify(item.name)) !== currentSlug)
    .slice(0, 2);

  node.innerHTML = related
    .map((item) => {
      const slug = item.slug || slugify(item.name);
      return `
        <article class="project-card panel reveal">
          <div class="project-image-wrap">
            <img class="project-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
          </div>
          <div class="project-body">
            <div class="project-topline">
              <span>${escapeHtml(item.category)}</span>
              <span>${escapeHtml(item.year)}</span>
            </div>
            <h3>${escapeHtml(item.name)}</h3>
            <p class="project-location">${escapeHtml(item.location)}</p>
            <p class="project-summary">${escapeHtml(item.summary)}</p>
            <a class="project-link" href="/project?slug=${encodeURIComponent(slug)}">Lihat Detail Proyek</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProjectPage(content) {
  const { slug, project } = getSelectedProject(content);

  if (!project) {
    throw new Error("Project not found");
  }

  document.title = `${project.name} | ${content.site.title}`;
  setText("detail-site-title", content.site.title);
  setText("detail-site-tagline", content.site.tagline);
  setText("detail-breadcrumb", `Beranda / Projects / ${project.name}`);
  setText("detail-category", project.category);
  setText("detail-title", project.name);
  setText("detail-summary", project.summary);
  setText("detail-challenge", project.challenge || project.summary);
  setText("detail-solution", project.solution || project.scope);
  setText("detail-result", project.result || project.summary);
  setText("detail-contact-title", content.contact.title);
  setText("detail-contact-description", content.contact.description);
  const contactButton = document.getElementById("detail-contact-button");
  contactButton.href = project.ctaHref || content.contact.whatsapp || "/";
  contactButton.textContent = project.ctaLabel || (content.contact.whatsapp ? "Chat WhatsApp" : "Kembali ke Beranda");

  const image = document.getElementById("detail-image");
  image.src = project.image;
  image.alt = project.name;

  const floorplan = document.getElementById("detail-floorplan-image");
  floorplan.src = project.floorplanImage || project.image;
  floorplan.alt = `Floorplan ${project.name}`;
  setText("detail-material-notes", project.materialNotes || "");

  renderMeta(project);
  renderMaterials(project);
  renderProjectProgress(content, project);
  renderGallery(project);
  renderBeforeAfter(content, slug);
  renderTestimonial(content, project);
  renderRelatedProjects(content, slug);
  initRevealAnimations();
}

async function init() {
  const content = await loadContent();
  renderProjectPage(content);
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <div class="page-shell">
      <section class="panel error-state">
        <h1>Proyek tidak ditemukan</h1>
        <p>Periksa kembali slug proyek atau buka daftar proyek untuk memilih halaman yang masih aktif.</p>
        <div class="error-actions">
          <a class="button primary" href="/projects">Lihat Semua Proyek</a>
          <a class="button secondary" href="/">Kembali ke Beranda</a>
        </div>
      </section>
    </div>
  `;
});
