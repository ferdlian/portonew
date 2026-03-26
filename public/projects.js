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

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderProjectsPage(content) {
  document.title = `Semua Proyek | ${content.site.title}`;
  document.getElementById("projects-site-title").textContent = content.site.title;
  document.getElementById("projects-site-tagline").textContent = content.site.tagline;
  document.getElementById("projects-page-title").textContent = content.projects.title;
  document.getElementById("projects-page-description").textContent = content.projects.description;
  document.getElementById("projects-page-meta").innerHTML = [
    { label: "Total proyek", value: String(content.projects.items.length) },
    { label: "With before / after", value: String((content.beforeAfter?.items || []).length) },
    { label: "Kategori aktif", value: String(new Set(content.projects.items.map((item) => item.category)).size) }
  ]
    .map(
      (item) => `
        <span class="directory-chip">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </span>
      `
    )
    .join("");
  document.getElementById("projects-cta-description").textContent = content.contact.description;
  const ctaButton = document.getElementById("projects-cta-button");
  ctaButton.href = content.contact.whatsapp || "/";
  ctaButton.textContent = content.contact.whatsapp ? "Konsultasi via WhatsApp" : "Kembali ke Beranda";

  const heroProject = content.projects.items[0];
  const heroImage = document.getElementById("projects-hero-image");
  heroImage.src = heroProject?.image || "";
  heroImage.alt = heroProject?.name || content.site.title;

  const beforeAfterSlugs = new Set((content.beforeAfter?.items || []).map((item) => item.projectSlug));
  const grid = document.getElementById("projects-list-grid");

  grid.innerHTML = content.projects.items
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
            <div class="project-meta-inline">
              <span>${escapeHtml(item.client || "Private Client")}</span>
              <span>${escapeHtml(item.duration || "Custom timeline")}</span>
              ${beforeAfterSlugs.has(slug) ? "<span>Before / After</span>" : ""}
            </div>
            <a class="project-link" href="/project?slug=${encodeURIComponent(slug)}">Lihat Detail Proyek</a>
          </div>
        </article>
      `;
    })
    .join("");

  initRevealAnimations();
}

async function init() {
  const content = await loadContent();
  renderProjectsPage(content);
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <div class="page-shell">
      <section class="panel error-state">
        <h1>Daftar proyek gagal dimuat</h1>
        <p>Periksa server atau data proyek di CMS, lalu coba buka lagi halaman ini.</p>
        <div class="error-actions">
          <a class="button primary" href="/">Kembali ke Beranda</a>
          <a class="button secondary" href="/admin">Buka CMS</a>
        </div>
      </section>
    </div>
  `;
});
