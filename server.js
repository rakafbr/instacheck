const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ganti dari xlsx -> json
const DATASET_PATH = path.join(__dirname, "data", "dataset.json");

// ===== Helpers =====
function normalize(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function loadDataset() {
  if (!fs.existsSync(DATASET_PATH)) {
    console.log("⚠ dataset.json not found");
    return { set: new Set(), count: 0 };
  }

  try {
    const raw = fs.readFileSync(DATASET_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    // support:
    // 1) ["a", "b", ...]
    // 2) [{account:"..."}, ...] (punyamu)
    // 3) [{anyKey:"..."}, ...] -> ambil key pertama seperti versi xlsx dulu
    const set = new Set();

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        console.log("⚠ dataset.json empty array");
        return { set, count: 0 };
      }

      if (typeof parsed[0] === "string") {
        for (const v of parsed) {
          const n = normalize(v);
          if (n) set.add(n);
        }
      } else if (parsed[0] && typeof parsed[0] === "object") {
        const preferredKey = "account";
        const fallbackKey = Object.keys(parsed[0] || {})[0]; // mirip logic xlsx lama
        const keyToUse = preferredKey in parsed[0] ? preferredKey : fallbackKey;

        for (const row of parsed) {
          const v = normalize(row?.[keyToUse]);
          if (v) set.add(v);
        }
      }
    } else {
      console.log("⚠ dataset.json must be an array");
      return { set: new Set(), count: 0 };
    }

    console.log(`✅ Dataset loaded: ${set.size} rows`);
    return { set, count: set.size };
  } catch (err) {
    console.log("❌ Failed to load dataset.json:", err.message);
    return { set: new Set(), count: 0 };
  }
}

// ===== In-memory index =====
let INDEX = loadDataset();

// Auto reload jika file JSON diganti
fs.watchFile(DATASET_PATH, { interval: 1000 }, () => {
  console.log("🔄 dataset.json changed → reloading");
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
