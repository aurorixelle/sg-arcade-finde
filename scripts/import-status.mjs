// One-time import of per-cab machine status from the sheet's maimai/CHUNITHM
// status tabs into arcade docs (machineStatus field) + seed maimai prices.
//
//   node scripts/import-status.mjs          # dry run (default): parse + report only
//   node scripts/import-status.mjs --write  # also merge into Firestore + src/data/arcades.json
//
// Firestore writes require scripts/service-account.json (same as seed-firestore.mjs).
// Writes are always { merge: true } so no other field on the docs is touched.
//
// Sheet layout per status tab (verified against the live CSV):
//   - preamble rows (legend, "Information as of <date>", "Latest Version")
//   - chain section rows: only col 0 filled (the Zone X section is labelled
//     "Cowboy Utopia (Zone X)")
//   - "Location,Version,Notes" header rows
//   - location rows: cols 0/1/2 = location/version/notes, cab labels from col 8
//       maimai:    one label every 2 columns (each cab = 1P+2P columns),
//                  followed by a "1P,2P,..." side row
//       chunithm:  one label per column, single status per cab
//   - then, in arbitrary order separated by blank rows: a status-emoji row,
//     a notes row and a dates row (dates are cab-level: may sit under either
//     side's column, so the sibling column is the fallback)

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCsv, slugify } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEET_ID = "1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc";
const KEY_PATH = path.join(ROOT, "scripts", "service-account.json");
const JSON_PATH = path.join(ROOT, "src", "data", "arcades.json");
const WRITE = process.argv.includes("--write");

const TABS = [
  { game: "maimai", gid: "1605813410", splitSides: true },
  { game: "chunithm", gid: "1707745004", splitSides: false },
];

const FIRST_CAB_COL = 8;

// Sheet chain labels that differ from the canonical chain names.
const CHAIN_ALIASES = { "cowboy utopia (zone x)": "Zone X" };

// Sheet "chain|location" (normalized) -> canonical "chain|branch" when the
// status tab's location name differs from the arcade-list branch name.
const LOCATION_OVERRIDES = {
  "paco funworld|kallang wave mall": "Paco FunWorld|Kallang Wave Mall (ArcadiaX)",
  "paco funworld|imall (marine parade)": "Paco FunWorld|iMall",
  "zone x|eastpoint mall": "Zone X|Eastpoint Mall (Cowboy Utopia)",
};

// Sheet legend emoji -> stored status key. Match with variation selectors stripped.
const STATUS_BY_EMOJI = { "✅": "ok", "⚠": "minor", "❌": "down", "⬇": "guest", "⚫": "off", "❓": "unknown" };

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// Strip the emoji variation selector (U+FE0F) and zero-width joiner (U+200D)
// so "⚠" and "⚠️" compare equal. Written with fromCharCode to keep the source
// free of invisible characters.
const VARIATION = new RegExp(`[${String.fromCharCode(0xfe0f)}${String.fromCharCode(0x200d)}]`, "g");
const normEmoji = (s) => String(s).replace(VARIATION, "").trim();
const normKey = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
const pad2 = (n) => String(n).padStart(2, "0");

function isoDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// "24 May 2026" or "8/16/2026" (US M/D/Y, the only slash format observed) -> "YYYY-MM-DD"
function parseDateCell(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    return mon ? isoDate(m[3], mon, m[1]) : null;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    let first = parseInt(m[1], 10);
    let second = parseInt(m[2], 10);
    if (first > 12 && second <= 12) {
      console.warn(`  !! date "${s}" looks like D/M/Y — treating month as ${second}`);
      [first, second] = [second, first];
    }
    return isoDate(m[3], first, second);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tab parsing
// ---------------------------------------------------------------------------
function parseTab(rows, tab, chains) {
  const blocks = [];
  let asOf = null;
  let started = false;
  let chain = null;
  let block = null; // { location, version, notes, cabs: [{label, col}], status: {}, note: {}, date: {} }

  const finishBlock = () => {
    if (!block) return;
    blocks.push(block);
    block = null;
  };

  for (const row of rows) {
    const cells = row.map((c) => (c ?? "").trim());
    const col0 = cells[0] || "";

    if (!col0) {
      // Content row (status / sides / notes / dates) inside the current block
      if (!block) continue;
      const cols = [];
      for (let c = FIRST_CAB_COL; c < cells.length; c++) if (cells[c]) cols.push(c);
      if (!cols.length) continue;

      if (normEmoji(cells[FIRST_CAB_COL]) === "1P") continue; // side sub-header
      const emojis = cols.every((c) => STATUS_BY_EMOJI[normEmoji(cells[c])]);
      if (emojis) {
        for (const c of cols) block.status[c] = STATUS_BY_EMOJI[normEmoji(cells[c])];
        continue;
      }
      const dates = cols.every((c) => parseDateCell(cells[c]));
      if (dates) {
        for (const c of cols) block.date[c] = parseDateCell(cells[c]);
        continue;
      }
      for (const c of cols) {
        if (normEmoji(cells[c]).length <= 2) {
          console.warn(`  ?? unclassified cell "${cells[c]}" at ${block.location} col ${c}`);
          continue;
        }
        block.note[c] = block.note[c] ? `${block.note[c]}\n${cells[c]}` : cells[c];
      }
      continue;
    }

    // Col-0 rows from here on: preamble metadata, chain headers, table headers, locations
    if (col0.startsWith("Information as of")) {
      asOf = parseDateCell(cells[1]);
      continue;
    }

    const chainKey = CHAIN_ALIASES[normKey(col0)] ?? (chains.has(normKey(col0)) ? normKey(col0) : null);
    if (chainKey) {
      finishBlock();
      chain = chainKey;
      started = true;
      continue;
    }
    if (!started) continue; // preamble (title, legend, "Latest Version", ...)
    if (col0 === "Location") {
      finishBlock();
      continue;
    }

    // Location row: col 0 = name, col 1 = version, col 2 = notes, cab labels from col 8
    finishBlock();
    const cabs = [];
    if (tab.splitSides) {
      for (let c = FIRST_CAB_COL; c < cells.length; c += 2) {
        if (cells[c]) cabs.push({ label: cells[c], col: c });
      }
    } else {
      for (let c = FIRST_CAB_COL; c < cells.length; c++) {
        if (cells[c]) cabs.push({ label: cells[c], col: c });
      }
    }
    block = {
      chain,
      location: col0.replace(/\n+/g, " "),
      version: cells[1] || "",
      notes: cells[2] || "",
      cabs,
      status: {},
      note: {},
      date: {},
    };
  }
  finishBlock();
  return { asOf, blocks };
}

// Block -> stored machineStatus entry { version, notes, asOf, cabs: [...] }
function blockToEntry(block, tab, asOf) {
  const cabs = [];
  if (tab.splitSides) {
    for (const { label, col } of block.cabs) {
      cabs.push({
        id: label,
        side: "1P",
        status: block.status[col] ?? "unknown",
        note: block.note[col] || "",
        reportedAt: block.date[col] ?? block.date[col + 1] ?? null,
      });
      cabs.push({
        id: label,
        side: "2P",
        status: block.status[col + 1] ?? "unknown",
        note: block.note[col + 1] || "",
        reportedAt: block.date[col + 1] ?? block.date[col] ?? null,
      });
    }
  } else {
    for (const { label, col } of block.cabs) {
      cabs.push({
        id: label,
        side: null,
        status: block.status[col] ?? "unknown",
        note: block.note[col] || "",
        reportedAt: block.date[col] ?? null,
      });
    }
  }
  return { version: block.version, notes: block.notes, asOf, cabs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const arcades = JSON.parse(await readFile(JSON_PATH, "utf8"));
  const byBranch = new Map(arcades.map((a) => [normKey(`${a.chain}|${a.branch}`), a]));
  const chains = new Set(arcades.map((a) => normKey(a.chain)));

  // docId -> { game -> entry }
  const imported = new Map();
  let skipped = 0;
  let unknownStatuses = 0;

  for (const tab of TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${tab.gid}`;
    console.log(`\n== ${tab.game} tab (gid ${tab.gid}) ==`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);
    const { asOf, blocks } = parseTab(parseCsv(await res.text()), tab, chains);
    console.log(`Parsed ${blocks.length} location blocks (information as of ${asOf ?? "?"})`);

    for (const block of blocks) {
      const sheetKey = normKey(`${block.chain}|${block.location}`);
      const canonical = LOCATION_OVERRIDES[sheetKey];
      const arcade = canonical ? byBranch.get(normKey(canonical)) : byBranch.get(sheetKey);
      if (!arcade) {
        console.warn(`  [skip] ${block.chain} | ${block.location} — no arcade doc`);
        skipped++;
        continue;
      }
      const entry = blockToEntry(block, tab, asOf);
      unknownStatuses += entry.cabs.filter((c) => c.status === "unknown").length;

      const docId = slugify(arcade.name);
      if (!imported.has(docId)) imported.set(docId, {});
      imported.get(docId)[tab.game] = entry;

      const expected = arcade.games?.[tab.game] ?? 0;
      const count = tab.splitSides ? entry.cabs.length / 2 : entry.cabs.length;
      const flag = expected === count ? "ok" : "MISMATCH";
      console.log(
        `  [${flag}] ${docId} — ${count} ${tab.game} cabs (${entry.cabs.length} entries)` +
          ` vs games.${tab.game}=${expected}; labels: ${block.cabs.map((c) => c.label).join(" ")}`
      );
    }
  }

  // Price seed, grounded in the sheet's (*) footnote: "the pricing for maimai
  // is higher at 14 tokens / 4 medals ... rather than the usual 10 tokens / 3
  // medals". Chunithm prices are left for admins to fill in.
  const priceSeed = {};
  for (const a of arcades) {
    if ((a.games?.maimai ?? 0) > 0) {
      priceSeed[slugify(a.name)] = { maimai: a.higherPricing ? "14 tokens / 4 medals" : "10 tokens / 3 medals" };
    }
  }

  console.log(`\n== Summary ==`);
  console.log(`Docs with imported status: ${imported.size}; skipped sheet locations: ${skipped}; unknown-status cabs: ${unknownStatuses}`);
  console.log(`Price seed: ${Object.keys(priceSeed).length} arcades get prices.maimai (${Object.values(priceSeed).filter((p) => p.maimai.startsWith("14")).length} at higher pricing)`);

  if (!WRITE) {
    console.log("\nDry run — nothing written. Re-run with --write to apply.");
    return;
  }

  // --- arcades.json merge (keeps snapshot mode in sync) ---
  for (const a of arcades) {
    const id = slugify(a.name);
    if (imported.has(id)) {
      a.machineStatus = { ...(a.machineStatus ?? {}), ...imported.get(id) };
    }
    if (priceSeed[id]) {
      a.prices = { ...(a.prices ?? {}), ...priceSeed[id] };
    }
  }
  await writeFile(JSON_PATH, JSON.stringify(arcades, null, 2) + "\n");
  console.log(`\nUpdated ${path.relative(ROOT, JSON_PATH)}`);

  // --- Firestore merge writes ---
  if (!existsSync(KEY_PATH)) {
    console.error(`\nMissing ${path.relative(ROOT, KEY_PATH)} — Firestore docs NOT updated.`);
    console.error("Firebase console → Project settings → Service accounts → Generate new private key, save it there, re-run.");
    process.exit(1);
  }
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  initializeApp({ credential: cert(JSON.parse(await readFile(KEY_PATH, "utf8"))) });
  const db = getFirestore();

  let n = 0;
  for (const [docId, games] of imported) {
    await db.collection("arcades").doc(docId).set({ machineStatus: games }, { merge: true });
    n++;
  }
  let p = 0;
  for (const [docId, prices] of Object.entries(priceSeed)) {
    await db.collection("arcades").doc(docId).set({ prices }, { merge: true });
    p++;
  }
  console.log(`Firestore: merged machineStatus into ${n} docs, prices into ${p} docs.`);
}

// Exported for spot-checking/tests; only auto-run when invoked directly.
export { parseTab, blockToEntry };

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
