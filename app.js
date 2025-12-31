// ==================== CORE ==================== //
const tabs = document.querySelectorAll(".tab");
const sections = {
  batsearch: document.getElementById("tab-batsearch"),
  findrep: document.getElementById("tab-findrep"),
  redupe: document.getElementById("tab-redupe"),
  cleanink: document.getElementById("tab-cleanink"),
  folsync: document.getElementById("tab-folsync"),
};

tabs.forEach((t) => {
  t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.remove("tab--active"));
    t.classList.add("tab--active");
    Object.values(sections).forEach((s) => s.classList.add("is-hidden"));
    sections[t.dataset.tab].classList.remove("is-hidden");
  });
});

const TOAST_MS = 1250;
let toastTimer = null;

function ensureToast() {
  let el = document.getElementById("toast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "toast";
  el.className = "toast";
  el.innerHTML = `
    <div class="toast__row">
      <div class="toast__text" id="toastText">Text copied to clipboard</div>
    </div>
    <div class="toast__bar">
      <div class="toast__fill" id="toastFill"></div>
    </div>
  `;
  document.body.appendChild(el);
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

// ==================== UTILS ==================== //
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

// ==================== USER INTERFACE ==================== //
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
    pill.textContent = `📑 ${Math.floor(DATASET_MAP.size/2)}`;
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

// ==================== FEATURES - BATCH SEARCH ==================== //
const searchResults = document.getElementById("batsearchResults");
const searchStat = document.getElementById("batsearchStat");
const searchResultsBlock = document.getElementById("batsearchResultsBlock");

document.getElementById("btnBatsearch").addEventListener("click", () => {
  if (searchResultsBlock) searchResultsBlock.classList.remove("is-hidden");
  runSearch();
});

document.getElementById("btnBatsearchClear").addEventListener("click", () => {
  document.getElementById("batsearchInput").value = "";
  searchResults.innerHTML = "";
  searchStat.textContent = "";
  if (searchResultsBlock) searchResultsBlock.classList.add("is-hidden");
});

function runSearch() {
  const inputs = getLinesFromTextarea("batsearchInput");
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

// ==================== FEATURES - FIND REPLACE ==================== //
document.getElementById("btnFindrep").addEventListener("click", () => {
  const input = document.getElementById("frInput").value;

  const pairs = [
    { f: find1.value, r: rep1.value },
  ].filter((p) => p.f);

  let out = input;
  for (const p of pairs) {
    const esc = p.f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(esc, "g"), p.r ?? "");
  }
  frOutput.value = out;

  findrepOutputWrap.classList.remove("is-hidden");
});

document.getElementById("btnFindrepClear").addEventListener("click", () => {
  frInput.value = "";
  frOutput.value = "";
  find1.value = rep1.value = "";

  findrepOutputWrap.classList.add("is-hidden");
});

const findrepOutputWrap = document.getElementById("findrepOutputWrap");

copyFrInput.onclick = () => copyText(frInput.value);
copyFrOutput.onclick = () => copyText(frOutput.value);

// ==================== FEATURES - REMOVE DUPLICATE ==================== //
document.getElementById("btnredupe").addEventListener("click", () => {
  const lines = getLinesFromTextarea("redupeInput");
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

  redupeOutput.value = unique.join("\n");
  removedData.value = removed.join("\n");
  redupeStat.textContent = `${lines.length} Original ┆ ${removed.length} Removed ┆ ${unique.length} Remaining`;

  redupeOutputWrap.classList.remove("is-hidden");
  removedDataWrap.classList.remove("is-hidden");
});

const redupeOutputWrap = document.getElementById("redupeOutputWrap");
const removedDataWrap = document.getElementById("removedDataWrap");

btnredupeClear.onclick = () => {
  redupeInput.value = "";
  redupeOutput.value = "";
  removedData.value = "";
  redupeStat.textContent = "";

  redupeOutputWrap.classList.add("is-hidden");
  removedDataWrap.classList.add("is-hidden");
};

copyredupeInput.onclick = () => copyText(redupeInput.value);
copyredupeOutput.onclick = () => copyText(redupeOutput.value);
copyRemovedData.onclick = () => copyText(removedData.value);

// ==================== FEATURES - LINK CLEANER ==================== //
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

const cleaninkInput = document.getElementById("cleaninkInput");
const cleaninkOutput = document.getElementById("cleaninkOutput");
const cleaninkResultWrap = document.getElementById("cleaninkResultWrap");

const btnCleanink = document.getElementById("btnCleanink");
const btnKeeplink = document.getElementById("btnKeeplink");
const btnCleaninkClear = document.getElementById("btnCleaninkClear");
const copyCleaninkOutput = document.getElementById("copyCleaninkOutput");

copyCleaninkOutput.onclick = () => copyText(cleaninkOutput.value);

btnCleanink.addEventListener("click", () => {
  const cleaned = cleanInstagramToList(cleaninkInput.value);
  cleaninkOutput.value = cleaned;
  cleaninkResultWrap.classList.remove("is-hidden");
});

btnKeeplink?.addEventListener("click", () => {
  const lines = (cleaninkInput?.value || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^instagram\.com\/\S+$/i.test(l));

  cleaninkOutput.value = lines.join("\n");
  cleaninkResultWrap.classList.remove("is-hidden");
});

btnCleaninkClear.addEventListener("click", () => {
  cleaninkInput.value = "";
  cleaninkOutput.value = "";
  cleaninkResultWrap.classList.add("is-hidden");
});

// ==================== FEATURES - FOLLOWERS SYNC ==================== //
let followersMap = new Map();
let followingMap = new Map();

const folsyncResults = document.getElementById("folsyncResults");
const folsyncSideStat = document.getElementById("folsyncSideStat");
const folsyncResultsBlock = document.getElementById("folsyncResultsBlock");

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
  if (folsyncResultsBlock) folsyncResultsBlock.classList.add("is-hidden");
  folsyncResults.innerHTML = "";
  folsyncSideStat.textContent = "";
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
  if (folsyncResultsBlock) folsyncResultsBlock.classList.add("is-hidden");
  folsyncResults.innerHTML = "";
  folsyncSideStat.textContent = "";
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

    if (folsyncResultsBlock) folsyncResultsBlock.classList.add("is-hidden");
    folsyncResults.innerHTML = "";
    folsyncSideStat.textContent = "";
    await onFile(file);
  });
}
setupDropzone("dropFollowers", loadFollowersFile);
setupDropzone("dropFollowing", loadFollowingFile);

function ensureIgMapsLoaded() {
  return followersMap.size > 0 && followingMap.size > 0;
}

function renderIgResults(items, title) {
  folsyncResults.innerHTML = "";

  if (!items.length) {
    folsyncResults.appendChild(
      renderCard({
        statusBadge: null,
        title: "Tidak ada hasil 🎉",
        sub: "",
        actions: [],
      })
    );
    folsyncSideStat.textContent = `┆ 0 account ${title}`;
    return;
  }

  items.forEach((it) => {
    folsyncResults.appendChild(
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

  folsyncSideStat.textContent = `┆ ${items.length} ${title}`;
}

document.getElementById("btnNotFollowMe").addEventListener("click", () => {
  if (folsyncResultsBlock) folsyncResultsBlock.classList.remove("is-hidden");
  folsyncResults.innerHTML = "";
  folsyncSideStat.textContent = "";

  if (!ensureIgMapsLoaded()) {
    folsyncSideStat.textContent = "Upload your data to sync followers";
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
  if (folsyncResultsBlock) folsyncResultsBlock.classList.remove("is-hidden");
  folsyncResults.innerHTML = "";
  folsyncSideStat.textContent = "";

  if (!ensureIgMapsLoaded()) {
    folsyncSideStat.textContent = "Upload your data to sync followers";
    return;
  }

  const out = [];
  for (const [k, v] of followersMap.entries()) {
    if (!followingMap.has(k)) out.push(v);
  }
  out.sort((a, b) => a.username.localeCompare(b.username));
  renderIgResults(out, "Accounts you don't follow back");
});

document.getElementById("btnFolsyncClear").addEventListener("click", () => {
  fileFollowers.value = "";
  fileFollowing.value = "";
  followersMap = new Map();
  followingMap = new Map();

  setFileUI("followers", null, 0);
  setFileUI("following", null, 0);

  folsyncResults.innerHTML = "";
  folsyncSideStat.textContent = "";
  if (folsyncResultsBlock) folsyncResultsBlock.classList.add("is-hidden");
});