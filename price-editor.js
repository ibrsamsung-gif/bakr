window.createPriceEditor = function (sections, onChange) {
  "use strict";

  const key = "shawarma-bakr.price-revisions.v1";
  const snapshots = window.PRICE_SNAPSHOT;
  const items = sections.flatMap((section) => section.items);
  const dialog = document.getElementById("prices-dialog");
  const form = document.getElementById("price-form");
  const groups = document.getElementById("price-groups");
  const status = document.getElementById("price-status");
  const copyPicker = document.getElementById("price-copies");
  const download = document.getElementById("price-download");
  const upload = document.getElementById("price-import");
  const fields = new Map();
  const dateFormat = new Intl.DateTimeFormat("ar-PS", {
    dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Jerusalem"
  });
  let history = [];
  let baseline = {};

  function readHistory() {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(saved)) throw new Error("Invalid price history");
    return saved.map((snapshot) => snapshots.validate(snapshot, items));
  }

  try { history = readHistory(); } catch { /* Show the packaged prices if storage is unavailable. */ }

  function priceFor(item) {
    return history.at(-1)?.prices[item.id] ?? item.price;
  }

  function displayMessage(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("price-error", isError);
  }

  for (const section of sections) {
    const group = document.createElement("fieldset");
    const title = document.createElement("legend");
    title.textContent = section.name;
    group.append(title);
    for (const item of section.items) {
      const row = document.createElement("label");
      row.className = "price-edit-row";
      const name = document.createElement("span");
      name.textContent = item.name;
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.dir = "ltr";
      input.required = true;
      input.maxLength = 7;
      input.autocomplete = "off";
      input.addEventListener("input", () => input.setCustomValidity(""));
      row.append(name, input);
      group.append(row);
      fields.set(item.id, input);
    }
    groups.append(group);
  }

  function showSavedPrices() {
    baseline = Object.fromEntries(items.map((item) => [item.id, priceFor(item)]));
    for (const [id, input] of fields) {
      input.value = baseline[id];
      input.setCustomValidity("");
    }
    const options = history.map((snapshot, i) => new Option(
      `نسخة ${i + 1} · ${dateFormat.format(new Date(snapshot.savedAt))}`, String(i)
    )).reverse();
    copyPicker.replaceChildren(...(options.length ? options : [new Option("لا توجد نسخ محفوظة")]));
    copyPicker.disabled = download.disabled = options.length === 0;
  }

  function open() {
    displayMessage("");
    try { history = readHistory(); }
    catch { displayMessage("تعذّر فتح سجل الأسعار المحفوظة في هذا المتصفح.", true); }
    showSavedPrices();
    dialog.showModal();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const edits = Object.create(null);
    for (const [id, input] of fields) {
      const price = snapshots.normalize(input.value);
      if (price === null) {
        input.setCustomValidity("أدخل سعرًا بالأرقام، مع منزلتين عشريتين كحد أقصى.");
        input.reportValidity();
        return;
      }
      if (price !== baseline[id]) edits[id] = price;
    }
    if (Object.keys(edits).length === 0) {
      displayMessage("الأسعار مطابقة للنسخة الحالية.");
      return;
    }

    try {
      const saved = readHistory();
      const current = saved.at(-1)?.prices;
      const prices = Object.fromEntries(items.map((item) => [item.id, edits[item.id] ?? current?.[item.id] ?? item.price]));
      const next = [...saved, snapshots.create(prices)];
      localStorage.setItem(key, JSON.stringify(next));
      history = next;
    } catch {
      displayMessage("تعذّر حفظ الأسعار في هذا المتصفح. بقيت الأسعار السابقة معروضة.", true);
      return;
    }
    showSavedPrices();
    onChange();
    displayMessage(`حُفظت الأسعار. أُضيفت النسخة ${history.length} إلى السجل.`);
  });

  download.addEventListener("click", () => {
    const snapshot = history[Number(copyPicker.value)];
    if (!snapshot) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shawarma-bakr-prices-${snapshot.savedAt.replace(/[:.]/g, "-")}.json`;
    dialog.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById("price-upload").addEventListener("click", () => upload.click());
  upload.addEventListener("change", async () => {
    const file = upload.files[0];
    upload.value = "";
    if (!file) return;
    try {
      if (file.size > 256_000) throw new Error("Price file is too large");
      const snapshot = snapshots.validate(JSON.parse(await file.text()), items);
      if (!dialog.open) return;
      for (const [id, input] of fields) {
        if (Object.hasOwn(snapshot.prices, id)) input.value = snapshot.prices[id];
        input.setCustomValidity("");
      }
      displayMessage("تم تحميل النسخة. راجع الأسعار واضغط «حفظ الأسعار» لتطبيقها.");
    } catch {
      displayMessage("تعذّر قراءة الملف. اختر نسخة أسعار JSON من هذا المنيو.", true);
    }
  });

  dialog.querySelector('[data-action="close-prices"]').addEventListener("click", () => dialog.close());
  return { open, priceFor };
};
