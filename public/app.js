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

// ===== Status pill =====
async function refreshStatus() {
  try {
    const r = await fetch("/api/status");
    const j = await r.json();
    const pill = document.getElementById("statusPill");
    if (j.loaded) {
      pill.className = "pill pill--ok";
      pill.textContent = `Loaded 📑 ${j.count}`;
    } else {
      pill.className = "pill pill--muted";
      pill.textContent = "Dataset belum tersedia";
    }
  } catch {
    const pill = document.getElementById("statusPill");
    pill.className = "pill pill--muted";
    pill.textContent = "Status error";
  }
}
refreshStatus();

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

// ===== TAB 1: Batch Search =====
document.getElementById("btnSearch").addEventListener("click", runSearch);
document.getElementById("btnSearchClear").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchResults").innerHTML = "";
});

async function runSearch() {
  const lines = getLinesFromTextarea("searchInput");
  const box = document.getElementById("searchResults");
  box.innerHTML = "";
  if (!lines.length) return;

  const r = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines }),
  });
  const j = await r.json();

  j.results.forEach((item) => {
    const row = document.createElement("div");
    row.className = "result-item";

    const icon = document.createElement("div");
    icon.className =
      "icon " + (item.status === "match" ? "icon--ok" : "icon--no");
    icon.innerHTML =
      item.status === "match"
        ? `<span class="material-symbols-outlined">check</span>`
        : `<span class="material-symbols-outlined">close</span>`;

    const text = document.createElement("div");
    text.className = "result-text";
    text.textContent = item.input; // (4) hapus keterangan match/not match

    row.appendChild(icon);
    row.appendChild(text);
    box.appendChild(row);
  });
}

// ===== TAB 2: Find & Replace =====
document.getElementById("btnReplace").addEventListener("click", () => {
  const input = document.getElementById("frInput").value;

  const pairs = [
    {
      f: document.getElementById("find1").value,
      r: document.getElementById("rep1").value,
    },
    {
      f: document.getElementById("find2").value,
      r: document.getElementById("rep2").value,
    },
    {
      f: document.getElementById("find3").value,
      r: document.getElementById("rep3").value,
    },
  ].filter((p) => (p.f ?? "").length > 0);

  let out = input;
  for (const p of pairs) {
    const escaped = p.f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // plain text find
    out = out.replace(new RegExp(escaped, "g"), p.r ?? "");
  }
  document.getElementById("frOutput").value = out;
});

document.getElementById("btnReplaceClear").addEventListener("click", () => {
  document.getElementById("frInput").value = "";
  document.getElementById("frOutput").value = "";
  document.getElementById("find1").value = "";
  document.getElementById("rep1").value = "";
  document.getElementById("find2").value = "";
  document.getElementById("rep2").value = "";
  document.getElementById("find3").value = "";
  document.getElementById("rep3").value = "";
});

document.getElementById("copyFrInput").addEventListener("click", async () => {
  await copyText(document.getElementById("frInput").value);
});
document.getElementById("copyFrOutput").addEventListener("click", async () => {
  await copyText(document.getElementById("frOutput").value);
});

// ===== TAB 3: Remove Duplicate =====
document.getElementById("btnDedupe").addEventListener("click", () => {
  const lines = getLinesFromTextarea("dedupeInput");
  const original = lines.length;

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

  document.getElementById("dedupeOutput").value = unique.join("\n");
  document.getElementById("removedData").value = removed.join("\n");

  document.getElementById(
    "dedupeStat"
  ).textContent = `↪ ${original} original lines, ${removed.length} removed, ${unique.length} remaining`;
});

document.getElementById("btnDedupeClear").addEventListener("click", () => {
  document.getElementById("dedupeInput").value = "";
  document.getElementById("dedupeOutput").value = "";
  document.getElementById("removedData").value = "";
  document.getElementById("dedupeStat").textContent = "";
});

document
  .getElementById("copyDedupeInput")
  .addEventListener("click", async () => {
    await copyText(document.getElementById("dedupeInput").value);
  });
document
  .getElementById("copyDedupeOutput")
  .addEventListener("click", async () => {
    await copyText(document.getElementById("dedupeOutput").value);
  });
document
  .getElementById("copyRemovedData")
  .addEventListener("click", async () => {
    await copyText(document.getElementById("removedData").value);
  });
