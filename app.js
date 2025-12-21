const tabs = document.querySelectorAll(".tab");
const sections = {
  search: document.getElementById("tab-search"),
  replace: document.getElementById("tab-replace"),
  dedupe: document.getElementById("tab-dedupe"),
  cleaner: document.getElementById("tab-cleaner"),
  ig: document.getElementById("tab-ig"),
};

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("tab--active"));
    t.classList.add("tab--active");
    Object.values(sections).forEach((s) => s.classList.add("is-hidden"));
    sections[t.dataset.tab].classList.remove("is-hidden");
  });
});

const TOAST_MS = 2000;
let toastTimer = null;

function ensureToast() {
  let el = document.getElementById("toast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "toast";
  el.className = "toast";
  el.innerHTML = `
    <div class="toast__row">
      <div class="toast__left">
        <div class="toast__iconbox">
          <span class="material-symbols-outlined">content_copy</span>
        </div>
        <div class="toast__text" id="toastText">Text copied to clipboard</div>
      </div>
      <button class="toast__x" id="toastX" type="button">✕</button>
    </div>
    <div class="toast__bar"><div class="toast__fill" id="toastFill"></div></div>
  `;
  document.body.appendChild(el);

  document.getElementById("toastX").addEventListener("click", hideToast);
  return el;
}

function showToast(text = "Content copied to clipboard") {
  const toast = ensureToast();
  const textEl = document.getElementById("toastText");
  const fillEl = document.getElementById("toastFill");

  textEl.textContent = text;
  toast.classList.add("is-show");

  fillEl.style.transition = "none";
  fillEl.style.transform = "scaleX(1)";
  void fillEl.offsetWidth;
  fillEl.style.transition = `transform ${TOAST_MS}ms linear`;
  fillEl.style.transform = "scaleX(0)";

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.remove("is-show");
  clearTimeout(toastTimer);
  toastTimer = null;
}

function normalize(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function normalizeAccount(v) {
  return normalize(v).replace(/^@/, "");
}
function normalizeLink(v) {
  return normalize(v)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getLinesFromTextarea(id) {
  return document
    .getElementById(id)
    .value.split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function copyText(text) {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast("Content copied to clipboard");
  } catch (e) {
    console.error(e);
  }
}

function isInstagramLike(input) {
  const s = String(input ?? "").toLowerCase();
  return (
    s.includes("instagram.com") ||
    s.startsWith("http://") ||
    s.startsWith("https://")
  );
}
function extractUsernameFromMaybeLink(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  if (!raw.includes("instagram.com")) return normalizeAccount(raw);

  const cleaned = raw.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const bad = new Set(["explore", "p", "reel", "reels", "tv", "accounts"]);
  if (bad.has(last.toLowerCase())) return "";
  return normalizeAccount(last);
}
function displayAtUsername(username) {
  const u = normalizeAccount(username);
  return u ? `@${u}` : "@";
}
function displayIgLink(usernameOrLink) {
  const u = isInstagramLike(usernameOrLink)
    ? extractUsernameFromMaybeLink(usernameOrLink)
    : normalizeAccount(usernameOrLink);
  return u ? `instagram.com/${u}` : "instagram.com/";
}
function directIgUrl(usernameOrLink) {
  const u = isInstagramLike(usernameOrLink)
    ? extractUsernameFromMaybeLink(usernameOrLink)
    : normalizeAccount(usernameOrLink);
  return u ? `https://www.instagram.com/${u}/` : "https://www.instagram.com/";
}

let DATASET_MAP = new Map();

async function loadDataset() {
  const pill = document.getElementById("statusPill");
  try {
    const res = await fetch("dataset.json");
    const data = await res.json();

    DATASET_MAP.clear();

    (Array.isArray(data) ? data : []).forEach((item) => {
      if (!item?.account || !item?.link) return;

      const acc = normalizeAccount(item.account);
      const linkNorm = normalizeLink(item.link);
      const value = { account: acc, linkUrl: directIgUrl(item.link) };

      DATASET_MAP.set(acc, value);
      DATASET_MAP.set(linkNorm, value);
      DATASET_MAP.set(`instagram.com/${acc}`, value);
    });

    pill.className = "pill pill--ok";
    pill.textContent = `📑 ${Math.floor(DATASET_MAP.size / 3)}`;
  } catch (e) {
    pill.className = "pill pill--muted";
    pill.textContent = "Dataset error";
    console.error(e);
  }
}
loadDataset();

function renderCard({ statusBadge, title, sub, actions = [] }) {
  const card = document.createElement("div");
  card.className = "card";

  const left = document.createElement("div");
  left.className = "card__left";

  if (statusBadge) {
    const badge = document.createElement("div");
    badge.className = `badge ${
      statusBadge === "ok" ? "badge--ok" : "badge--no"
    }`;
    badge.innerHTML =
      statusBadge === "ok"
        ? `<span class="material-symbols-outlined">check</span>`
        : `<span class="material-symbols-outlined">close</span>`;
    left.appendChild(badge);
  }

  const text = document.createElement("div");
  text.className = "card__text";
  text.innerHTML = `
    <div class="card__title">${escapeHtml(title)}</div>
    ${sub ? `<div class="card__sub">${escapeHtml(sub)}</div>` : ""}
  `;
  left.appendChild(text);

  const actionBox = document.createElement("div");
  actionBox.className = "card__actions";

  actions.forEach((a) => {
    if (a.type === "link") {
      const btn = document.createElement("a");
      btn.className = "btn btn--secondary btn--tiny";
      btn.href = a.value;
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.textContent = a.label;
      actionBox.appendChild(btn);
    } else if (a.type === "copy") {
      const btn = document.createElement("button");
      btn.className = "btn btn--secondary btn--tiny";
      btn.type = "button";
      btn.textContent = a.label;
      btn.addEventListener("click", () => copyText(a.value));
      actionBox.appendChild(btn);
    }
  });

  card.appendChild(left);
  card.appendChild(actionBox);
  return card;
}

const searchResults = document.getElementById("searchResults");
const searchStat = document.getElementById("searchStat");
const searchResultsBlock = document.getElementById("searchResultsBlock");

document.getElementById("btnSearch").addEventListener("click", () => {
  if (searchResultsBlock) searchResultsBlock.classList.remove("is-hidden");
  runSearch();
});

document.getElementById("btnSearchClear").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  searchResults.innerHTML = "";
  searchStat.textContent = "";
  if (searchResultsBlock) searchResultsBlock.classList.add("is-hidden");
});

function runSearch() {
  const inputs = getLinesFromTextarea("searchInput");
  searchResults.innerHTML = "";

  if (!inputs.length) {
    searchStat.textContent = "Tidak ada input.";
    return;
  }

  let match = 0;
  let notMatch = 0;

  inputs.forEach((raw) => {
    const key1 = isInstagramLike(raw)
      ? normalizeLink(raw)
      : normalizeAccount(raw);
    const key2 = isInstagramLike(raw)
      ? displayIgLink(raw)
      : `instagram.com/${normalizeAccount(raw)}`;
    const found = DATASET_MAP.get(key1) || DATASET_MAP.get(key2);

    if (found) match++;
    else notMatch++;

    const username = found
      ? found.account
      : extractUsernameFromMaybeLink(raw) || normalizeAccount(raw);
    const title = displayAtUsername(username);
    const sub = displayIgLink(username);

    const viewUrl = found ? found.linkUrl : directIgUrl(username);

    searchResults.appendChild(
      renderCard({
        statusBadge: found ? "ok" : "no",
        title,
        sub,
        actions: [
          { label: "View", type: "link", value: viewUrl },
          { label: "Copy", type: "copy", value: username || raw },
        ],
      })
    );
  });

  searchStat.textContent = `${match} Account match ┆ ${notMatch} Account not match`;
}

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
  dedupeStat.textContent = `${lines.length} Original ┆ ${removed.length} Removed ┆ ${unique.length} Remaining`;
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

let followersMap = new Map();
let followingMap = new Map();

const igResults = document.getElementById("igResults");
const igSideStat = document.getElementById("igSideStat");
const igResultsBlock = document.getElementById("igResultsBlock");

const fileFollowers = document.getElementById("fileFollowers");
const fileFollowing = document.getElementById("fileFollowing");

const followersName = document.getElementById("followersName");
const followersCount = document.getElementById("followersCount");
const followingName = document.getElementById("followingName");
const followingCount = document.getElementById("followingCount");

document
  .getElementById("btnPickFollowers")
  .addEventListener("click", () => fileFollowers.click());
document
  .getElementById("btnPickFollowing")
  .addEventListener("click", () => fileFollowing.click());

function setFileUI(which, file, count) {
  if (which === "followers") {
    followersName.textContent = file ? file.name : "No file chosen";
    followersCount.textContent = file ? `${count} Account` : "";
  } else {
    followingName.textContent = file ? file.name : "No file chosen";
    followingCount.textContent = file ? `${count} Account` : "";
  }
}

function parseFromUsername(username) {
  const u = String(username ?? "")
    .replace(/^@/, "")
    .trim();
  if (!u) return null;
  return { username: u, url: directIgUrl(u) };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("FileReader error"));
    r.onload = () => resolve(String(r.result ?? ""));
    r.readAsText(file);
  });
}

function parseInstagramJSON(obj) {
  const map = new Map();
  const pushUser = (username, href) => {
    const parsed = parseFromUsername(username);
    if (!parsed) return;
    map.set(parsed.username.toLowerCase(), {
      username: parsed.username,
      url: href ? directIgUrl(href) : parsed.url,
    });
  };

  const walk = (x) => {
    if (!x) return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (typeof x === "string") return pushUser(x);
    if (typeof x === "object") {
      if (Array.isArray(x.string_list_data)) {
        for (const s of x.string_list_data) {
          const val = s?.value || s?.string || s?.name;
          const href = s?.href;
          if (val) pushUser(val, href);
        }
      }
      for (const k of Object.keys(x)) walk(x[k]);
    }
  };

  walk(obj);
  return map;
}

function parseInstagramHTML(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const map = new Map();

  const anchors = Array.from(doc.querySelectorAll("a[href]"))
    .map((a) => a.getAttribute("href"))
    .filter(Boolean);

  for (const href0 of anchors) {
    if (!href0.includes("instagram.com")) continue;

    const cleaned = href0.split("?")[0].split("#")[0].replace(/\/+$/, "");
    const parts = cleaned.split("/").filter(Boolean);
    const username = parts[parts.length - 1];

    const bad = new Set(["explore", "p", "reel", "reels", "tv", "accounts"]);
    if (!username || bad.has(username.toLowerCase())) continue;

    const parsed = parseFromUsername(username);
    if (!parsed) continue;

    map.set(parsed.username.toLowerCase(), parsed);
  }

  if (map.size === 0) {
    const h2s = Array.from(doc.querySelectorAll("h2"))
      .map((x) => x.textContent?.trim())
      .filter(Boolean);
    for (const t of h2s) {
      const parsed = parseFromUsername(t);
      if (!parsed) continue;
      map.set(parsed.username.toLowerCase(), parsed);
    }
  }

  return map;
}

async function parseInstagramFile(file) {
  if (!file) return new Map();
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const txt = await readFileAsText(file);
  if (ext === "json") return parseInstagramJSON(JSON.parse(txt));
  return parseInstagramHTML(txt);
}

async function loadFollowersFile(file) {
  followersMap = await parseInstagramFile(file);
  setFileUI("followers", file, followersMap.size);
}

async function loadFollowingFile(file) {
  followingMap = await parseInstagramFile(file);
  setFileUI("following", file, followingMap.size);
}

fileFollowers.addEventListener("change", async () => {
  if (igResultsBlock) igResultsBlock.classList.add("is-hidden");
  igResults.innerHTML = "";
  igSideStat.textContent = "";
  const f = fileFollowers.files?.[0];
  if (!f) return;
  try {
    await loadFollowersFile(f);
  } catch (e) {
    console.error(e);
    setFileUI("followers", f, 0);
  }
});

fileFollowing.addEventListener("change", async () => {
  if (igResultsBlock) igResultsBlock.classList.add("is-hidden");
  igResults.innerHTML = "";
  igSideStat.textContent = "";
  const f = fileFollowing.files?.[0];
  if (!f) return;
  try {
    await loadFollowingFile(f);
  } catch (e) {
    console.error(e);
    setFileUI("following", f, 0);
  }
});

function setupDropzone(zoneId, onFile) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  ["dragenter", "dragover"].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      stop(e);
      zone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      stop(e);
      zone.classList.remove("is-dragover");
    });
  });

  zone.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file || !/\.(html|json)$/i.test(file.name)) return;

    if (igResultsBlock) igResultsBlock.classList.add("is-hidden");
    igResults.innerHTML = "";
    igSideStat.textContent = "";
    await onFile(file);
  });
}
setupDropzone("dropFollowers", loadFollowersFile);
setupDropzone("dropFollowing", loadFollowingFile);

function ensureIgMapsLoaded() {
  return followersMap.size > 0 && followingMap.size > 0;
}

function renderIgResults(items, title) {
  igResults.innerHTML = "";

  if (!items.length) {
    igResults.appendChild(
      renderCard({
        statusBadge: null,
        title: "Tidak ada hasil 🎉",
        sub: "",
        actions: [],
      })
    );
    igSideStat.textContent = `┆ 0 account ${title}`;
    return;
  }

  items.forEach((it) => {
    igResults.appendChild(
      renderCard({
        statusBadge: null,
        title: displayAtUsername(it.username),
        sub: displayIgLink(it.username),
        actions: [
          { label: "View", type: "link", value: directIgUrl(it.username) },
          { label: "Copy", type: "copy", value: it.username },
        ],
      })
    );
  });

  igSideStat.textContent = `┆ ${items.length} ${title}`;
}

document.getElementById("btnNotFollowMe").addEventListener("click", () => {
  if (igResultsBlock) igResultsBlock.classList.remove("is-hidden");
  igResults.innerHTML = "";
  igSideStat.textContent = "";

  if (!ensureIgMapsLoaded()) {
    igSideStat.textContent = "Upload your data to sync followers";
    return;
  }

  const out = [];
  for (const [k, v] of followingMap.entries()) {
    if (!followersMap.has(k)) out.push(v);
  }
  out.sort((a, b) => a.username.localeCompare(b.username));
  renderIgResults(out, "Accounts not following you");
});

document.getElementById("btnINotFollow").addEventListener("click", () => {
  if (igResultsBlock) igResultsBlock.classList.remove("is-hidden");
  igResults.innerHTML = "";
  igSideStat.textContent = "";

  if (!ensureIgMapsLoaded()) {
    igSideStat.textContent = "Upload your data to sync followers";
    return;
  }

  const out = [];
  for (const [k, v] of followersMap.entries()) {
    if (!followingMap.has(k)) out.push(v);
  }
  out.sort((a, b) => a.username.localeCompare(b.username));
  renderIgResults(out, "Accounts you don't follow back");
});

document.getElementById("btnIgClear").addEventListener("click", () => {
  fileFollowers.value = "";
  fileFollowing.value = "";
  followersMap = new Map();
  followingMap = new Map();

  setFileUI("followers", null, 0);
  setFileUI("following", null, 0);

  igResults.innerHTML = "";
  igSideStat.textContent = "";
  if (igResultsBlock) igResultsBlock.classList.add("is-hidden");
});

function cleanInstagramToList(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  const re = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)(?:\/)?/g;

  const blocked = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "about"]);

  const out = [];
  const seen = new Set();
  let m;

  while ((m = re.exec(text)) !== null) {
    const u = (m[1] || "").trim();
    if (!u) continue;
    if (blocked.has(u.toLowerCase())) continue;

    const line = `instagram.com/${u}`;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  // Fallback: kalau user paste @username atau username per baris
  if (out.length === 0) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const l of lines) {
      const u = l.replace(/^@/, "");
      if (!u) continue;
      const line = `instagram.com/${u}`;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line);
    }
  }

  return out.join("\n");
}

// ===== CLEANER TAB (match index.html IDs) =====
const cleanerInput = document.getElementById("cleanerInput");
const cleanerOutput = document.getElementById("cleanerOutput");
const cleanerResultWrap = document.getElementById("cleanerResultWrap");

const btnCleanerIg = document.getElementById("btnCleanerIg");
const btnCleanerClear = document.getElementById("btnCleanerClear");
const copyCleanerOutput = document.getElementById("copyCleanerOutput");

// Copy: tetap pakai toast global "Content copied to clipboard"
copyCleanerOutput.onclick = () => copyText(cleanerOutput.value);

// Clean button: show result setelah klik (tanpa toast lain)
btnCleanerIg.addEventListener("click", () => {
  const cleaned = cleanInstagramToList(cleanerInput.value);
  cleanerOutput.value = cleaned;
  cleanerResultWrap.classList.remove("is-hidden"); // ini yang bikin result muncul
});

// Clear button: hide lagi (tanpa toast)
btnCleanerClear.addEventListener("click", () => {
  cleanerInput.value = "";
  cleanerOutput.value = "";
  cleanerResultWrap.classList.add("is-hidden");
});
