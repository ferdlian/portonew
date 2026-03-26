let testimonialsController;
let galleryController;
let revealObserver;
let statsObserver;

async function loadContent() {
  const response = await fetch("/api/content");
  if (!response.ok) {
    throw new Error("Failed to load content");
  }

  return response.json();
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

function setLink(id, label, href) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = label ?? "";
  node.href = href ?? "#";
  node.hidden = false;
}

function setOptionalLink(id, label, href) {
  const node = document.getElementById(id);
  if (!node) return;

  if (!label || !href) {
    node.hidden = true;
    node.textContent = "";
    node.removeAttribute("href");
    return;
  }

  node.hidden = false;
  node.textContent = label;
  node.href = href;
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

function renderNav(items) {
  const nav = document.getElementById("main-nav");
  nav.innerHTML = items
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("");
}

function renderStats(items) {
  const container = document.getElementById("stats");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="stat-card panel reveal">
          <strong class="stat-value" data-stat-target="${escapeHtml(item.value)}">${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `
    )
    .join("");
}

function setHeroBackdrop(image, label) {
  const heroImage = document.getElementById("hero-backdrop-image");
  if (!heroImage) return;
  heroImage.src = image;
  heroImage.alt = label || "Hero background";
}

function renderHeroShowcase(projects, stats, heroBackgroundImage) {
  const container = document.getElementById("hero-showcase");
  const featuredProject = projects?.[0];
  const statLead = stats?.[0];
  const backgroundImage = heroBackgroundImage || featuredProject?.image;

  if (!featuredProject) {
    container.innerHTML = "";
    return;
  }

  setHeroBackdrop(backgroundImage, featuredProject.name);

  container.innerHTML = `
    <article class="showcase-card">
      <img class="showcase-image" src="${escapeHtml(backgroundImage)}" alt="${escapeHtml(featuredProject.name)}" />
      <div class="showcase-overlay">
        <span class="showcase-kicker">Featured Build</span>
        <h3>${escapeHtml(featuredProject.name)}</h3>
        <p>${escapeHtml(featuredProject.location)} • ${escapeHtml(featuredProject.year)}</p>
        <div class="showcase-metric">
          <strong>${escapeHtml(statLead?.value || featuredProject.category)}</strong>
          <span>${escapeHtml(statLead?.label || featuredProject.category)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderHighlights(items) {
  const container = document.getElementById("hero-highlights");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="highlight-row reveal">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderHeroMeta(content) {
  const container = document.getElementById("hero-meta");
  if (!container) return;

  const projectCount = content.projects?.items?.length || 0;
  const activeProjectCount = content.projectProgress?.items?.length || 0;
  const beforeAfterCount = content.beforeAfter?.items?.length || 0;

  container.innerHTML = [
    { value: String(projectCount), label: "Portfolio tampil" },
    { value: String(activeProjectCount), label: "Proyek berjalan" },
    { value: String(beforeAfterCount), label: "Transformasi tampil" }
  ]
    .map(
      (item) => `
        <article class="hero-meta-card">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `
    )
    .join("");
}

function renderServices(items) {
  const container = document.getElementById("services-grid");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="service-card reveal">
          <p class="service-meta">${escapeHtml(item.meta)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
}

function renderProjects(items) {
  const container = document.getElementById("projects-grid");
  container.innerHTML = items
    .map(
      (item) => {
        const projectSlug = item.slug || slugify(item.name);
        return `
        <article class="project-card reveal">
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
            <a class="project-link" href="/project?slug=${encodeURIComponent(projectSlug)}">Lihat Detail Proyek</a>
          </div>
        </article>
      `;
      }
    )
    .join("");
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

function initGallery(section) {
  const track = document.getElementById("gallery-track");
  const dots = document.getElementById("gallery-dots");
  const prevButton = document.getElementById("gallery-prev");
  const nextButton = document.getElementById("gallery-next");
  const counter = document.getElementById("gallery-counter");
  const items = section?.items || [];

  if (!track || !dots || !prevButton || !nextButton || !counter) {
    return;
  }

  if (galleryController) {
    galleryController.abort();
  }

  galleryController = new AbortController();
  const { signal } = galleryController;

  if (items.length === 0) {
    track.innerHTML = `
      <article class="gallery-slide is-empty">
        <div class="gallery-slide-copy">
          <p class="eyebrow">Galeri</p>
          <h3>Belum ada foto galeri</h3>
          <p>Tambahkan item galeri dari CMS agar slider tampil di halaman depan.</p>
        </div>
      </article>
    `;
    dots.innerHTML = "";
    counter.textContent = "0 / 0";
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  track.innerHTML = items
    .map(
      (item, index) => `
        <article class="gallery-slide">
          <div class="gallery-slide-media">
            <img class="gallery-slide-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
          </div>
          <div class="gallery-slide-copy">
            <p class="eyebrow">Frame ${String(index + 1).padStart(2, "0")}</p>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.detail)}</p>
          </div>
        </article>
      `
    )
    .join("");

  dots.innerHTML = items
    .map((_, index) => `<button class="gallery-slider-dot" type="button" data-index="${index}" aria-label="Pindah ke foto ${index + 1}"></button>`)
    .join("");

  let activeIndex = 0;
  let timer;
  const allowAutoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function update(index) {
    activeIndex = (index + items.length) % items.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    counter.textContent = `${activeIndex + 1} / ${items.length}`;

    dots.querySelectorAll(".gallery-slider-dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  }

  function stopAuto() {
    window.clearInterval(timer);
  }

  function startAuto() {
    stopAuto();
    if (!allowAutoplay || items.length < 2) {
      return;
    }
    timer = window.setInterval(() => update(activeIndex + 1), 5600);
  }

  dots.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(".gallery-slider-dot");
      if (!button) return;
      update(Number(button.dataset.index));
      startAuto();
    },
    { signal }
  );

  prevButton.addEventListener(
    "click",
    () => {
      update(activeIndex - 1);
      startAuto();
    },
    { signal }
  );

  nextButton.addEventListener(
    "click",
    () => {
      update(activeIndex + 1);
      startAuto();
    },
    { signal }
  );

  track.parentElement?.addEventListener("mouseenter", stopAuto, { signal });
  track.parentElement?.addEventListener("mouseleave", startAuto, { signal });
  signal.addEventListener("abort", stopAuto);

  prevButton.disabled = items.length < 2;
  nextButton.disabled = items.length < 2;
  update(0);
  startAuto();
}

function renderProjectProgress(content) {
  const container = document.getElementById("project-progress-grid");
  if (!container) return;

  const section = content?.projectProgress || {};
  const items = section?.items || [];
  const timelineItems = content?.projectTimeline?.items || [];
  setSectionVisibility("project-progress", items.length > 0);

  if (items.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const percent = normalizeProgressValue(item.progressPercent);
      const tone = normalizeProgressTone(item.statusTone);
      const projectHref = item.projectSlug ? `/project?slug=${encodeURIComponent(item.projectSlug)}` : "/projects";
      const timeline = timelineItems
        .filter((entry) => entry.projectSlug === item.projectSlug)
        .slice(0, 2);
      const fallbackTimeline = [item.updatePointA, item.updatePointB]
        .filter(Boolean)
        .map((note, index) => ({
          dateLabel: `Update ${index + 1}`,
          title: item.phase,
          note
        }));
      const visibleTimeline = timeline.length > 0 ? timeline : fallbackTimeline;

      return `
        <article class="project-progress-card project-progress-card--${tone} reveal">
          <div class="project-progress-media">
            <img class="project-progress-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
          </div>
          <div class="project-progress-body">
            <div class="project-progress-top">
              <div>
                <p class="service-meta">${escapeHtml(item.phase)}</p>
                <h3>${escapeHtml(item.title)}</h3>
                <p class="project-location">${escapeHtml(item.location)}</p>
              </div>
              <div class="project-progress-badge-wrap">
                <span class="project-progress-status">${escapeHtml(item.statusLabel || "On track")}</span>
                <span class="project-progress-badge">${percent}%</span>
              </div>
            </div>
            <div class="project-progress-bar" aria-hidden="true">
              <span style="width: ${percent}%"></span>
            </div>
            <div class="project-progress-meta">
              <span>Fase: ${escapeHtml(item.phase)}</span>
              <span>Target: ${escapeHtml(item.targetDate)}</span>
            </div>
            <p class="project-summary">${escapeHtml(item.statusNote)}</p>
            <div class="project-progress-timeline">
              ${visibleTimeline
                .map(
                  (entry) => `
                    <div class="project-progress-timeline-item">
                      <span></span>
                      <p>
                        <strong>${escapeHtml(entry.dateLabel || "Update")}</strong>
                        ${entry.title ? `<em>${escapeHtml(entry.title)}</em>` : ""}
                        ${entry.note ? `<span>${escapeHtml(entry.note)}</span>` : ""}
                      </p>
                    </div>
                  `
                )
                .join("")}
            </div>
            <a class="project-link" href="${escapeHtml(projectHref)}">Lihat Detail Proyek</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBeforeAfter(section) {
  const container = document.getElementById("before-after-grid");
  if (!container) return;

  const items = section?.items || [];
  container.innerHTML = items
    .map(
      (item) => `
        <article class="compare-card reveal">
          <div class="compare-card-header">
            <div>
              <p class="service-meta">Transformasi</p>
              <h3>${escapeHtml(item.title)}</h3>
              <p class="project-location">${escapeHtml(item.location)}</p>
            </div>
            <a class="project-link" href="/project?slug=${encodeURIComponent(item.projectSlug)}">Lihat Detail</a>
          </div>
          <div class="compare-split">
            <figure class="compare-pane">
              <img class="compare-image" src="${escapeHtml(item.beforeImage)}" alt="Before ${escapeHtml(item.title)}" />
              <figcaption>Before</figcaption>
            </figure>
            <figure class="compare-pane">
              <img class="compare-image" src="${escapeHtml(item.afterImage)}" alt="After ${escapeHtml(item.title)}" />
              <figcaption>After</figcaption>
            </figure>
          </div>
          <p class="project-summary">${escapeHtml(item.summary)}</p>
        </article>
      `
    )
    .join("");
}

function renderProcess(items) {
  const container = document.getElementById("process-grid");
  container.innerHTML = items
    .map(
      (item) => `
        <article class="process-card reveal">
          <span class="process-step">${escapeHtml(item.step)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
}

function initTestimonials(section) {
  const track = document.getElementById("testimonials-track");
  const dots = document.getElementById("testimonials-dots");
  const prevButton = document.getElementById("testimonial-prev");
  const nextButton = document.getElementById("testimonial-next");
  const items = section.items || [];

  if (testimonialsController) {
    testimonialsController.abort();
  }

  testimonialsController = new AbortController();
  const { signal } = testimonialsController;

  track.innerHTML = items
    .map(
      (item) => `
        <article class="testimonial-slide reveal">
          <div class="testimonial-content">
            <div class="testimonial-client">
              <img class="testimonial-avatar" src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.name)}" />
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.role)}</span>
              </div>
            </div>
            <p class="testimonial-quote">"${escapeHtml(item.quote)}"</p>
          </div>
          <div class="testimonial-project">
            <img class="testimonial-project-image" src="${escapeHtml(item.projectImage)}" alt="${escapeHtml(item.projectName)}" />
            <div class="testimonial-project-copy">
              <span>Proyek Terkait</span>
              <strong>${escapeHtml(item.projectName)}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  dots.innerHTML = items
    .map((_, index) => `<button class="testimonial-dot" type="button" data-index="${index}" aria-label="Pindah ke slide ${index + 1}"></button>`)
    .join("");

  if (items.length === 0) {
    return;
  }

  let activeIndex = 0;
  let timer;
  const autoplayMs = Number(section.autoplayMs || 5000);

  function update(index) {
    activeIndex = (index + items.length) % items.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;

    dots.querySelectorAll(".testimonial-dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  }

  function stopAuto() {
    window.clearInterval(timer);
  }

  function startAuto() {
    stopAuto();
    if (items.length < 2) return;
    timer = window.setInterval(() => update(activeIndex + 1), autoplayMs);
  }

  dots.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(".testimonial-dot");
      if (!button) return;
      update(Number(button.dataset.index));
      startAuto();
    },
    { signal }
  );

  prevButton.addEventListener(
    "click",
    () => {
      update(activeIndex - 1);
      startAuto();
    },
    { signal }
  );

  nextButton.addEventListener(
    "click",
    () => {
      update(activeIndex + 1);
      startAuto();
    },
    { signal }
  );

  track.parentElement.addEventListener("mouseenter", stopAuto, { signal });
  track.parentElement.addEventListener("mouseleave", startAuto, { signal });

  signal.addEventListener("abort", stopAuto);

  update(0);
  startAuto();
}

function parseAnimatedStat(rawValue) {
  const stringValue = String(rawValue ?? "").trim();
  const match = stringValue.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);

  if (!match) {
    return null;
  }

  const [, prefix, numeric, suffix] = match;
  const decimals = numeric.includes(".") ? numeric.split(".")[1].length : 0;

  return {
    prefix,
    number: Number(numeric),
    suffix,
    decimals
  };
}

function initStatCounters() {
  if (statsObserver) {
    statsObserver.disconnect();
  }

  const values = document.querySelectorAll(".stat-value");
  statsObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const node = entry.target;
        const parsed = parseAnimatedStat(node.dataset.statTarget);
        if (!parsed) {
          statsObserver.unobserve(node);
          continue;
        }

        const start = performance.now();
        const duration = 1300;

        function frame(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = parsed.number * eased;
          const formatted = parsed.decimals > 0 ? value.toFixed(parsed.decimals) : Math.round(value).toString();
          node.textContent = `${parsed.prefix}${formatted}${parsed.suffix}`;

          if (progress < 1) {
            requestAnimationFrame(frame);
            return;
          }

          node.textContent = `${parsed.prefix}${parsed.number}${parsed.suffix}`;
        }

        requestAnimationFrame(frame);
        statsObserver.unobserve(node);
      }
    },
    {
      threshold: 0.45
    }
  );

  values.forEach((node) => statsObserver.observe(node));
}

function initRevealAnimations() {
  if (revealObserver) {
    revealObserver.disconnect();
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((node) => {
      node.style.removeProperty("--reveal-delay");
      node.classList.add("is-visible");
    });
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  document.querySelectorAll(".reveal").forEach((node, index) => {
    node.style.setProperty("--reveal-delay", `${Math.min(index * 35, 220)}ms`);
    node.classList.remove("is-visible");
    revealObserver.observe(node);
  });
}

function renderSite(content) {
  document.title = content.site.title;
  setText("site-title", content.site.title);
  setText("site-tagline", content.site.tagline);
  renderNav(content.site.nav);

  setText("hero-eyebrow", content.hero.eyebrow);
  setText("hero-headline", content.hero.headline);
  setText("hero-description", content.hero.description);
  setText("hero-highlight-label", content.hero.highlightLabel);
  setLink("hero-primary", content.hero.primaryCta.label, content.hero.primaryCta.href);
  setLink("hero-secondary", content.hero.secondaryCta.label, content.hero.secondaryCta.href);
  renderHeroMeta(content);
  renderHeroShowcase(content.projects.items, content.stats, content.hero.backgroundImage);
  renderHighlights(content.hero.highlights);

  renderStats(content.stats);

  setText("services-title", content.services.title);
  setText("services-description", content.services.description);
  renderServices(content.services.items);

  setText("projects-title", content.projects.title);
  setText("projects-description", content.projects.description);
  renderProjects(content.projects.items);

  setText("project-progress-title", content.projectProgress?.title);
  setText("project-progress-description", content.projectProgress?.description);
  renderProjectProgress(content);

  setText("gallery-title", content.gallery.title);
  setText("gallery-description", content.gallery.description);
  initGallery(content.gallery);

  setText("before-after-title", content.beforeAfter?.title);
  setText("before-after-description", content.beforeAfter?.description);
  renderBeforeAfter(content.beforeAfter);

  setText("process-title", content.process.title);
  renderProcess(content.process.items);

  setText("testimonials-title", content.testimonials.title);
  setText("testimonials-description", content.testimonials.description);
  initTestimonials(content.testimonials);

  setText("cta-title", content.cta.title);
  setText("cta-description", content.cta.description);
  setLink("cta-button", content.cta.buttonLabel, content.cta.buttonHref);

  setText("contact-title", content.contact.title);
  setText("contact-description", content.contact.description);
  setOptionalLink("contact-email", content.contact.email, content.contact.email ? `mailto:${content.contact.email}` : "");
  setOptionalLink("contact-phone", content.contact.phone, content.contact.phone ? `tel:${content.contact.phone}` : "");
  setOptionalLink("contact-whatsapp", "Chat WhatsApp", content.contact.whatsapp);
  setText("contact-address", content.contact.address);
  setText("contact-hours", content.contact.hours);
  setText("footer-copy", content.footer.copyright);

  initRevealAnimations();
  initStatCounters();
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "cms-preview") return;
  renderSite(event.data.payload);
});

async function init() {
  const content = await loadContent();
  renderSite(content);
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <div class="page-shell">
      <section class="panel error-state">
        <h1>Konten gagal dimuat</h1>
        <p>Periksa server atau data konten di CMS, lalu coba muat ulang halaman.</p>
        <div class="error-actions">
          <a class="button primary" href="/admin">Buka CMS</a>
          <a class="button secondary" href="/">Coba Muat Ulang</a>
        </div>
      </section>
    </div>
  `;
});
