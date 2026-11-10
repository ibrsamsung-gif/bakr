(() => {
  "use strict";

  const data = window.MENU_DATA;
  const stage = document.getElementById("stage");
  const params = new URLSearchParams(location.search);
  const full = { type: "menu", label: "المنيو الكامل" };
  const groups = data.sections.map((section) => ({
    type: "section", label: section.name, section,
    items: section.items.map((item) => ({ type: "item", label: `${item.name} · ${section.name}`, item, section }))
  }));
  const items = groups.flatMap((group) => group.items);
  const modes = {
    smart: { label: "عرض تلقائي ذكي", slides: [...groups.flatMap((group) => [group, ...group.items]), full] },
    sections: { label: "عرض الأقسام", slides: [...groups, full] },
    showcase: { label: "كل صنف لوحده", slides: items },
    menu: { label: "القائمة الكاملة", slides: [full] }
  };
  const exporting = params.get("export") === "1";
  const storageKey = "shawarma-bakr.slide-duration-ms";
  const requestedMode = params.get("mode");
  let mode = Object.hasOwn(modes, requestedMode) ? requestedMode : exporting ? "menu" : "smart";
  let index = Math.max(0, Math.min(modes[mode].slides.length - 1, Math.trunc(Number(params.get("index"))) || 0));
  let duration = validDuration(params.get("duration")) || readDuration() || data.slideDurationMs;
  let paused = false;
  let timer;
  let deadline = 0;
  let remaining = 0;
  let slideDuration = 0;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function validDuration(value) {
    const ms = Number(value);
    return Number.isFinite(ms) && ms >= 1000 && ms <= 60000 ? ms : 0;
  }

  function readDuration() {
    try { return validDuration(localStorage.getItem(storageKey)); }
    catch { return 0; }
  }

  stage.classList.toggle("export-mode", exporting);
  stage.classList.toggle("no-hero", params.get("nohero") === "1");
  stage.innerHTML = `
    <header class="topbar">
      <h1 class="brand-heading">
        <button class="brand" type="button" data-action="panel" aria-controls="display-panel" aria-expanded="false" aria-haspopup="dialog" aria-label="${escapeHtml(data.restaurant.name)}، خيارات العرض">
          <svg class="brand-icon" viewBox="0 0 56 76" aria-hidden="true">
            <path d="M28 4v68" stroke="var(--charcoal)" stroke-width="4" stroke-linecap="round"/>
            <path d="M12 18c8-9 24-9 32 0l-4 9c-8 5-16 5-24 0l-4-9Zm2 20c9-7 19-7 28 0l-3 10c-8 4-14 4-22 0l-3-10Zm4 20c7-5 13-5 20 0l-3 10H21l-3-10Z" fill="var(--charcoal)"/>
          </svg>
          <span class="brand-name">${escapeHtml(data.restaurant.name)}</span>
        </button>
      </h1>
      <p class="brand-location">${escapeHtml(data.restaurant.location)}</p>
      <button class="panel-toggle" type="button" data-action="panel" aria-label="فتح خيارات العرض" title="خيارات العرض" aria-controls="display-panel" aria-expanded="false" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </header>
    <div id="visual" class="visual"></div>
    <div class="progress-track" aria-hidden="true"><div id="progress-bar"></div></div>
    <dialog id="display-panel" class="display-panel" aria-labelledby="panel-heading">
      <header class="panel-header">
        <h2 id="panel-heading">خيارات العرض</h2>
        <form method="dialog"><button class="panel-close" aria-label="إغلاق خيارات العرض" autofocus>×</button></form>
      </header>
      <nav class="mode-tabs" aria-label="أوضاع العرض">
        ${Object.entries(modes).map(([key, value]) => `<button type="button" data-mode="${key}" aria-pressed="false">${value.label}</button>`).join("")}
      </nav>
      <div class="controls">
        <div class="slide-picker">
          <label for="slide-jump">الانتقال إلى شريحة</label>
          <select id="slide-jump"></select>
        </div>
        <div class="playback" aria-label="التنقل بين الشرائح">
          <button type="button" data-action="prev" aria-label="الشريحة السابقة" title="الشريحة السابقة">→</button>
          <button type="button" data-action="pause" aria-label="إيقاف مؤقت" title="إيقاف مؤقت">Ⅱ</button>
          <button type="button" data-action="next" aria-label="الشريحة التالية" title="الشريحة التالية">←</button>
          <span id="slide-count" dir="ltr" aria-label="رقم الشريحة"></span>
        </div>
        <div class="display-tools">
          <button type="button" data-action="fullscreen" aria-label="ملء الشاشة"><span aria-hidden="true">⛶</span><span class="fullscreen-label">ملء الشاشة</span></button>
          <button type="button" data-action="tv">تشغيل التلفاز</button>
          <button type="button" data-action="settings">الإعدادات</button>
        </div>
      </div>
    </dialog>
    <dialog id="tv-help" aria-labelledby="tv-heading">
      <form method="dialog">
        <h2 id="tv-heading">تشغيل التلفاز</h2>
        <p>افتح المنيو في المتصفح واضغط F لملء الشاشة. يبدأ العرض الذكي تلقائيًا.</p>
        <p>للتشغيل من فلاشة، انسخ ملف MP4 إلى الفلاشة وفعّل التكرار في مشغّل التلفاز.</p>
        <div class="tv-downloads"><a href="videos/shawarma-bakr-menu-full.mp4" download>القائمة الكاملة</a><a href="videos/shawarma-bakr-showcase-cycle.mp4" download>دورة الأصناف</a></div>
        <div class="dialog-buttons"><button>تم</button></div>
      </form>
    </dialog>
    <dialog id="settings" aria-labelledby="settings-heading">
      <form method="dialog">
        <h2 id="settings-heading">إعدادات العرض</h2>
        <label for="slide-duration">مدة بطاقة الصنف بالثواني</label>
        <input id="slide-duration" type="number" min="1" max="60" step="0.1" required>
        <p>تبقى قوائم الأقسام على الشاشة مدة أطول من بطاقات الأصناف.</p>
        <p>استخدم ← للتالي و→ للسابق، والمسافة للإيقاف أو الاستئناف، وF لملء الشاشة.</p>
        <button class="dialog-secondary" type="button" data-action="prices">تعديل الأسعار</button>
        <div class="dialog-buttons"><button value="cancel" formnovalidate>إلغاء</button><button value="save">حفظ</button></div>
      </form>
    </dialog>
    <dialog id="prices-dialog" class="price-editor" aria-labelledby="prices-heading">
      <form id="price-form">
        <header class="price-editor-heading">
          <h2 id="prices-heading">تعديل الأسعار</h2>
          <button class="dialog-secondary" type="button" data-action="close-prices" autofocus>إغلاق</button>
        </header>
        <p>يُحفظ كل تعديل على هذا المتصفح ويظهر في جميع أوضاع المنيو.</p>
        <div id="price-groups" class="price-groups" aria-label="أسعار الأصناف بالشيقل"></div>
        <p id="price-status" class="price-status" role="status"></p>
        <div class="dialog-buttons"><button type="submit">حفظ الأسعار</button></div>
      </form>
      <section class="price-backups" aria-label="نسخ الأسعار">
        <label for="price-copies">النسخ المحفوظة</label>
        <select id="price-copies"></select>
        <div class="price-backup-actions">
          <button class="dialog-secondary" type="button" id="price-download">تنزيل النسخة</button>
          <button class="dialog-secondary" type="button" id="price-upload">استيراد نسخة</button>
          <input type="file" id="price-import" accept=".json,application/json" hidden>
        </div>
      </section>
    </dialog>`;

  const visual = document.getElementById("visual");
  const jump = document.getElementById("slide-jump");
  const count = document.getElementById("slide-count");
  const progress = document.getElementById("progress-bar");
  const panel = document.getElementById("display-panel");
  const dialog = document.getElementById("settings");
  const tvHelp = document.getElementById("tv-help");
  const durationInput = document.getElementById("slide-duration");
  const panelButtons = [...stage.querySelectorAll('[data-action="panel"]')];
  const tabButtons = [...stage.querySelectorAll("[data-mode]")];
  const prevButton = stage.querySelector('[data-action="prev"]');
  const nextButton = stage.querySelector('[data-action="next"]');
  const pauseButton = stage.querySelector('[data-action="pause"]');
  const fullscreenButton = stage.querySelector('[data-action="fullscreen"]');
  const priceEditor = window.createPriceEditor(data.sections, render);
  stage.querySelector('[data-action="prices"]').addEventListener("click", priceEditor.open);

  function badge(availability) {
    return availability ? `<span class="availability">${escapeHtml(availability)}</span>` : "";
  }

  function priceMarkup(value) {
    return `<bdi class="item-price" dir="ltr" style="--price-length:${String(value).length}">
      <span class="price-symbol" aria-hidden="true">${escapeHtml(data.currency.symbol)}</span>
      <span>${escapeHtml(value)}</span><span class="sr-only" lang="ar" dir="rtl"> ${escapeHtml(data.currency.name)}</span>
    </bdi>`;
  }

  function rows(section) {
    return section.items.map((item) => `
      <div class="item-row" data-item="${escapeHtml(item.id)}">
        <span class="item-name fit-line"><span>${escapeHtml(item.name)}</span></span>
        ${priceMarkup(priceEditor.priceFor(item))}
      </div>`).join("");
  }

  function menuMarkup() {
    return `<section class="full-menu" aria-label="المنيو الكامل">
      ${data.sections.map((section) => `
        <section class="menu-section ${escapeHtml(section.id)}">
          <div class="section-head"><h2>${escapeHtml(section.name)}</h2>${badge(section.availability)}</div>
          <div class="menu-items">${rows(section)}</div>
        </section>`).join("")}
      <figure class="skewer-zone"><img src="assets/images/chicken-skewer.jpg" alt="صورة توضيحية لسيخ شاورما دجاج"></figure>
    </section>`;
  }

  function sectionMarkup({ section }) {
    return `<section class="section-slide" aria-label="${escapeHtml(section.name)}">
      <header class="section-slide-heading">
        <h2>${escapeHtml(section.name)}</h2>${badge(section.availability)}
      </header>
      <div class="feature-photo">
        <img src="${escapeHtml(section.items[0].image)}" alt="صورة توضيحية لقسم ${escapeHtml(section.name)}">
      </div>
      <div class="section-grid" style="--rows:${Math.ceil(section.items.length / 2)}">${rows(section)}</div>
    </section>`;
  }

  function itemMarkup({ item, section }) {
    return `<article class="showcase" aria-label="${escapeHtml(item.name)}، ${escapeHtml(section.name)}">
      <div class="feature-photo"><img src="${escapeHtml(item.image)}" alt="صورة توضيحية لصنف ${escapeHtml(item.name)}"></div>
      <div class="showcase-copy">
        <div class="section-head"><span class="section-chip">${escapeHtml(section.name)}</span>${badge(section.availability)}</div>
        <h2 class="fit-line"><span>${escapeHtml(item.name)}</span></h2>
        <div class="price-lockup"><span class="price-caption">السعر</span>${priceMarkup(priceEditor.priceFor(item))}</div>
      </div>
    </article>`;
  }

  function slides() { return modes[mode].slides; }

  function fitNames() {
    const labels = [...visual.querySelectorAll(".fit-line")];
    for (const label of labels) label.firstElementChild.style.fontSize = "";
    const sizes = labels.map((label) => {
      const text = label.firstElementChild;
      const width = text.getBoundingClientRect().width;
      const available = label.clientWidth;
      return available && width > available
        ? Math.floor(parseFloat(getComputedStyle(text).fontSize) * (available - 1) / width * 10) / 10
        : null;
    });
    labels.forEach((label, i) => {
      if (sizes[i] !== null) label.firstElementChild.style.fontSize = `${sizes[i]}px`;
    });
  }

  function stopClock() {
    clearTimeout(timer);
    if (deadline) remaining = Math.max(0, deadline - performance.now());
    deadline = 0;
    if (slideDuration) progress.style.transform = `scaleX(${1 - remaining / slideDuration})`;
    progress.style.transition = "none";
    stage.classList.remove("is-playing");
  }

  function startClock() {
    if (deadline || slides().length === 1 || paused || panel.open || dialog.open || tvHelp.open || document.hidden || exporting) return;
    deadline = performance.now() + remaining;
    timer = setTimeout(() => move(1), remaining);
    progress.getBoundingClientRect();
    progress.style.transition = `transform ${remaining}ms linear`;
    progress.style.transform = "scaleX(1)";
    stage.classList.add("is-playing");
  }

  function updateControls() {
    const rotating = slides().length > 1;
    jump.disabled = prevButton.disabled = nextButton.disabled = pauseButton.disabled = !rotating;
    pauseButton.textContent = paused ? "▶" : "Ⅱ";
    pauseButton.title = paused ? "استئناف" : "إيقاف مؤقت";
    pauseButton.setAttribute("aria-label", pauseButton.title);
    jump.value = String(index);
    count.textContent = `${index + 1} / ${slides().length}`;
  }

  function render() {
    stopClock();
    const slide = slides()[index];
    const markup = { menu: menuMarkup, section: sectionMarkup, item: itemMarkup };
    visual.innerHTML = markup[slide.type](slide);
    fitNames();
    slideDuration = duration * (mode === "smart" && slide.type === "menu" ? 2 : slide.type === "section" ? 1.5 : 1);
    remaining = slideDuration;
    progress.style.transform = "scaleX(0)";
    stage.style.setProperty("--slide-duration", `${slideDuration}ms`);
    updateControls();
    startClock();
  }

  function setMode(nextMode, nextIndex = 0) {
    mode = nextMode;
    index = nextIndex;
    for (const button of tabButtons) button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    jump.replaceChildren(...slides().map((slide, i) => new Option(slide.label, String(i))));
    render();
  }

  function move(delta) {
    if (slides().length < 2) return;
    index = (index + delta + slides().length) % slides().length;
    render();
  }

  function togglePause() {
    if (slides().length < 2) return;
    paused = !paused;
    if (paused) stopClock(); else startClock();
    updateControls();
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      fullscreenButton.querySelector(".fullscreen-label").textContent = "استخدم ملء الشاشة في المتصفح";
    }
  }

  for (const button of panelButtons) button.addEventListener("click", () => {
    if (exporting || panel.open) return;
    stopClock();
    panel.showModal();
    panelButtons.forEach((trigger) => trigger.setAttribute("aria-expanded", "true"));
  });
  panel.addEventListener("close", () => {
    panelButtons.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    startClock();
  });
  panel.addEventListener("click", (event) => {
    if (event.target !== panel) return;
    const box = panel.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) panel.close();
  });
  for (const button of tabButtons) button.addEventListener("click", () => {
    paused = false;
    setMode(button.dataset.mode);
    panel.close();
  });
  prevButton.addEventListener("click", () => move(-1));
  nextButton.addEventListener("click", () => move(1));
  pauseButton.addEventListener("click", togglePause);
  fullscreenButton.addEventListener("click", () => { panel.close(); fullscreen(); });
  if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
  document.addEventListener("fullscreenchange", () => {
    const label = document.fullscreenElement ? "خروج من ملء الشاشة" : "ملء الشاشة";
    fullscreenButton.querySelector(".fullscreen-label").textContent = label;
    fullscreenButton.setAttribute("aria-label", label);
  });
  jump.addEventListener("change", () => { index = Number(jump.value); render(); });
  stage.querySelector('[data-action="tv"]').addEventListener("click", () => {
    stopClock();
    tvHelp.showModal();
  });
  tvHelp.addEventListener("close", startClock);
  stage.querySelector('[data-action="settings"]').addEventListener("click", () => {
    stopClock();
    durationInput.value = duration / 1000;
    dialog.returnValue = "";
    dialog.showModal();
  });
  dialog.addEventListener("close", () => {
    const nextDuration = validDuration(Number(durationInput.value) * 1000);
    if (dialog.returnValue === "save" && nextDuration && nextDuration !== duration) {
      duration = nextDuration;
      try { localStorage.setItem(storageKey, String(duration)); } catch { /* Storage can be unavailable for local files. */ }
      render();
    } else startClock();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock(); else startClock();
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || panel.open || dialog.open || tvHelp.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.("input, select, textarea")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? 1 : -1);
    } else if (event.code === "Space" && !event.target.closest?.("button")) {
      event.preventDefault();
      if (!event.repeat) togglePause();
    } else if (event.key.toLowerCase() === "f" && !event.repeat) fullscreen();
  });

  if (exporting) {
    panelButtons.forEach((button) => { button.disabled = true; });
  }
  new ResizeObserver(fitNames).observe(visual);
  document.fonts.addEventListener("loadingdone", fitNames);
  setMode(mode, index);
})();
