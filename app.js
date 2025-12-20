// ===== Tabs =====
const tabs = document.querySelectorAll(".tab");
const sections = {
  search: document.getElementById("tab-search"),
  replace: document.getElementById("tab-replace"),
  dedupe: document.getElementById("tab-dedupe"),
};

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("tab--active"));
    t.classList.add("tab--active");

    Object.values(sections).forEach((s) => s.classList.add("is-hidden"));
    sections[t.dataset.tab].classList.remove("is-hidden");
  });
});

// ===== Dataset (CLIENT SIDE) =====
let DATASET_SET = new Set();

function normalize(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function loadDataset() {
  const pill = document.getElementById("statusPill");
  try {
    const r = await fetch("dataset.json");
    const data = await r.json();

    DATASET_SET = new Set(data.map((x) => normalize(x.account)));

    pill.className = "pill pill--ok";
    pill.textContent = `Loaded 📑 ${DATASET_SET.size}`;
  } catch (e) {
    pill.className = "pill pill--muted";
    pill.textContent = "Dataset error";
    console.error(e);
  }
}
loadDataset();

// ===== Helpers =====
function getLinesFromTextarea(id) {
  return document
    .getElementById(id)
    .value.split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function copyText(text) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// ===== TAB 1: Batch Search (NO API) =====
document.getElementById("btnSearch").addEventListener("click", runSearch);
document.getElementById("btnSearchClear").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").innerHTML = "";
});

function runSearch() {
  const lines = getLinesFromTextarea("searchInput");
  const box = document.getElementById("searchResults");
  box.innerHTML = "";
  if (!lines.length) return;

  lines.forEach((v) => {
    const row = document.createElement("div");
    row.className = "result-item";

    const icon = document.createElement("div");
    const isMatch = DATASET_SET.has(normalize(v));
    icon.className = "icon " + (isMatch ? "icon--ok" : "icon--no");
    icon.innerHTML = isMatch
      ? `<span class="material-symbols-outlined">check</span>`
      : `<span class="material-symbols-outlined">close</span>`;

    const text = document.createElement("div");
    text.className = "result-text";
    text.textContent = v;

    row.appendChild(icon);
    row.appendChild(text);
    box.appendChild(row);
  });
}

// ===== TAB 2: Find & Replace (TIDAK DIUBAH) =====
document.getElementById("btnReplace").addEventListener("click", () => {
  const input = document.getElementById("frInput").value;

  const pairs = [
    { f: find1.value, r: rep1.value },
    { f: find2.value, r: rep2.value },
    { f: find3.value, r: rep3.value },
  ].filter((p) => p.f);

  let out = input;
  for (const p of pairs) {
    const esc = p.f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "g"), p.r ?? "");
  }
  frOutput.value = out;
});

document.getElementById("btnReplaceClear").addEventListener("click", () => {
  frInput.value = "";
  frOutput.value = "";
  find1.value = rep1.value = "";
  find2.value = rep2.value = "";
  find3.value = rep3.value = "";
});

copyFrInput.onclick = () => copyText(frInput.value);
copyFrOutput.onclick = () => copyText(frOutput.value);

// ===== TAB 3: Remove Duplicate (TIDAK DIUBAH) =====
document.getElementById("btnDedupe").addEventListener("click", () => {
  const lines = getLinesFromTextarea("dedupeInput");
  const seen = new Set();
  const unique = [];
  const removed = [];

  for (const l of lines) {
    if (seen.has(l)) removed.push(l);
    else {
      seen.add(l);
      unique.push(l);
    }
  }

  dedupeOutput.value = unique.join("\n");
  removedData.value = removed.join("\n");
  dedupeStat.textContent = `↪ ${lines.length} original, ${removed.length} removed, ${unique.length} remaining`;
});

btnDedupeClear.onclick = () => {
  dedupeInput.value = "";
  dedupeOutput.value = "";
  removedData.value = "";
  dedupeStat.textContent = "";
};

copyDedupeInput.onclick = () => copyText(dedupeInput.value);
copyDedupeOutput.onclick = () => copyText(dedupeOutput.value);
copyRemovedData.onclick = () => copyText(removedData.value);
