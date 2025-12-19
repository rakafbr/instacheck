const express = require("express");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATASET_PATH = path.join(__dirname, "data", "dataset.xlsx");

// ===== Helpers =====
function normalize(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function loadDataset() {
  if (!fs.existsSync(DATASET_PATH)) {
    console.log("⚠ dataset.xlsx not found");
    return { set: new Set(), count: 0 };
  }

  const wb = XLSX.readFile(DATASET_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const key = Object.keys(rows[0] || {})[0]; // kolom pertama
  const set = new Set();

  rows.forEach((r) => {
    const v = normalize(r[key]);
    if (v) set.add(v);
  });

  console.log(`✅ Dataset loaded: ${set.size} rows`);
  return { set, count: set.size };
}

// ===== In-memory index =====
let INDEX = loadDataset();

// Auto reload jika file Excel diganti
fs.watchFile(DATASET_PATH, { interval: 1000 }, () => {
  console.log("🔄 dataset.xlsx changed → reloading");
  INDEX = loadDataset();
});

// ===== API =====
app.get("/api/status", (req, res) => {
  res.json({
    loaded: INDEX.count > 0,
    count: INDEX.count,
  });
});

app.post("/api/search", (req, res) => {
  const lines = req.body?.lines || [];
  const results = lines.map((v) => ({
    input: v,
    status: INDEX.set.has(normalize(v)) ? "match" : "not match",
  }));
  res.json({ results });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});
