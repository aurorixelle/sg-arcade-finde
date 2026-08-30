// Generates src/data/arcades.json from the Google Sheet CSV snapshot.
// Usage: node scripts/generate-data.mjs
// - Downloads CSV export (follows Google's 307 redirect)
// - Parses arcade rows (chain section rows set the current chain)
// - Normalizes games text into structured counts
// - Geocodes postal codes via OneMap (cached in scripts/.geocache.json)
// - Applies the AREA_MAP table below for region / planning area
//
// Footnotes from the sheet:
//   (*) maimai pricing is higher (14 tokens / 4 medals instead of 10/3)
//   (^)  maimai cabinets accept 100 yen-medals as currency (name footnote);
//        in Operating Hours cells, (^) means may open later than stipulated

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHEET_ID = "1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc";
const GID = "306092234";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const CACHE_PATH = path.join(ROOT, "scripts", ".geocache.json");
const OUT_DIR = path.join(ROOT, "src", "data");
const OUT_PATH = path.join(OUT_DIR, "arcades.json");

const CHAINS = ["Virtualand", "Paco FunWorld", "Timezone", "Cow Play Cow Moo", "Zone X"];

// postal code -> { region, planningArea }. Singapore's 5 regions + planning areas.
// Keys are quoted strings: postals may have a leading zero (Suntec is 038983).
const AREA_MAP = {
  // Virtualand
  "188067": { region: "Central", planningArea: "Downtown Core" }, // Bugis+
  "556083": { region: "North-East", planningArea: "Serangoon" }, // NEX
  "437157": { region: "Central", planningArea: "Marine Parade" }, // KINEX
  // Paco FunWorld
  "397628": { region: "Central", planningArea: "Kallang" }, // Kallang Wave Mall
  "428802": { region: "Central", planningArea: "Marine Parade" }, // i12 Katong
  "449410": { region: "Central", planningArea: "Marine Parade" }, // iMall
  // Timezone
  "738099": { region: "North", planningArea: "Woodlands" }, // Causeway Point
  "608532": { region: "West", planningArea: "Jurong East" }, // Westgate
  "238878": { region: "Central", planningArea: "Orchard" }, // Orchard Xchange
  "828761": { region: "North-East", planningArea: "Punggol" }, // Waterway Point
  "519612": { region: "East", planningArea: "Pasir Ris" }, // Pasir Ris Mall
  "408600": { region: "Central", planningArea: "Geylang" }, // SingPost Centre (Paya Lebar)
  "528523": { region: "East", planningArea: "Tampines" }, // Our Tampines Hub
  "648886": { region: "West", planningArea: "Jurong West" }, // Jurong Point
  "208539": { region: "Central", planningArea: "Rochor" }, // City Square Mall
  "769098": { region: "North", planningArea: "Yishun" }, // Northpoint City
  // Cow Play Cow Moo
  "038983": { region: "Central", planningArea: "Downtown Core" }, // Suntec City
  "519599": { region: "East", planningArea: "Pasir Ris" }, // Downtown East
  "678278": { region: "West", planningArea: "Bukit Panjang" }, // Hillion Mall
  "529509": { region: "East", planningArea: "Tampines" }, // Century Square
  "768698": { region: "North", planningArea: "Yishun" }, // Wisteria Mall
  "820418": { region: "North-East", planningArea: "Punggol" }, // Northshore Plaza II
  "238895": { region: "Central", planningArea: "Orchard" }, // 313@somerset
  "570510": { region: "Central", planningArea: "Bishan" }, // Bishan
  "737736": { region: "North", planningArea: "Woodlands" }, // Woodlands
  "797653": { region: "North-East", planningArea: "Sengkang" }, // Seletar Mall
  "658713": { region: "West", planningArea: "Bukit Batok" }, // West Mall
  // Zone X
  "689812": { region: "West", planningArea: "Choa Chu Kang" }, // Lot One
  "528833": { region: "East", planningArea: "Tampines" }, // Eastpoint Mall
};

// ---------------------------------------------------------------------------
// CSV parsing (RFC-4180-ish: quoted fields may contain commas and newlines)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Field normalization
// ---------------------------------------------------------------------------
const GAME_KEYS = ["maimai", "chunithm", "taiko", "iidx", "sdvx", "ddr", "jubeat", "gitadora", "popn", "drs", "piu"];

function parseCabCount(cell) {
  if (!cell) return 0;
  const m = cell.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// Recognized games -> structured counts; unrecognized games -> extras list
function parseOtherGames(text) {
  const games = {};
  const extras = [];
  if (!text || /^(N\/A|TBD)$/i.test(text.trim())) return { games, extras };
  const tokens = text.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  for (const token of tokens) {
    const lower = token.toLowerCase();
    let key = null;
    if (lower.includes("taiko")) key = "taiko";
    else if (lower.includes("iidx") || lower.includes("beatmania")) key = "iidx";
    else if (lower.includes("sdvx") || lower.includes("sound voltex")) key = "sdvx";
    else if (lower.includes("ddr") || lower.includes("dance dance")) key = "ddr";
    else if (lower.includes("jubeat")) key = "jubeat";
    else if (lower.includes("gitadora")) key = "gitadora";
    else if (lower.includes("dancerush") || lower.includes("dance rush")) key = "drs";
    else if (lower.includes("pop'n") || lower.includes("pop'n music") || lower.includes("popn")) key = "popn";
    else if (lower.includes("piu") || lower.includes("pump it up")) key = "piu";
    if (!key) {
      extras.push(token.replace(/\s*\(.*?\)\s*/g, "").trim() || token);
      continue;
    }
    // counts: trailing "x2" / "PIUx1" or leading "1x DDR" / "1X IIDX"
    let count = 1;
    const trailing = token.match(/x\s*(\d+)$/i) || token.match(/x(\d+)/i);
    const leading = token.match(/^(\d+)\s*x/i);
    if (trailing) count = parseInt(trailing[1], 10);
    else if (leading) count = parseInt(leading[1], 10);
    games[key] = Math.max(games[key] || 0, count);
  }
  return { games, extras };
}

function parseSheltered(cell) {
  const value = (cell || "").trim();
  const sheltered = value.includes("✅");
  const note = value.replace(/✅|❌/g, "").replace(/[()]/g, "").trim();
  return { sheltered, shelteredNote: note || null };
}

function parseAddress(cell) {
  const raw = (cell || "").replace(/\r/g, "").trim();
  const postalMatch = raw.match(/(\d{6})/);
  const postal = postalMatch ? postalMatch[1] : null;
  const address = raw
    .replace(/,?\s*S\s*\(\s*\d{6}\s*\)/i, "") // ", S(658713)"
    .replace(/\(\s*S\s*\)\s*\d{6}/i, "") // "(S)188067"
    .replace(/\n+/g, " ")
    .replace(/,\s*$/, "")
    .trim();
  return { address, postal };
}

// ---------------------------------------------------------------------------
// Geocoding via OneMap (free, no key). Cached; retries with backoff.
// ---------------------------------------------------------------------------
async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocodeOnce(postal) {
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postal}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res = await fetch(url, { headers: { "User-Agent": "sg-arcade-finder/1.0" } });
  const text = await res.text();
  const json = JSON.parse(text); // throws on HTML error pages
  const hit = json.results && json.results[0];
  if (!hit) return null;
  return { lat: parseFloat(hit.LATITUDE), lng: parseFloat(hit.LONGITUDE), address: hit.ADDRESS };
}

async function geocode(cache, postal) {
  if (cache[postal]) return cache[postal];
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const rec = await geocodeOnce(postal);
      if (rec) {
        cache[postal] = rec;
        return rec;
      }
      console.warn(`  .. no OneMap result for ${postal}`);
      return null;
    } catch {
      if (attempt === 4) {
        console.warn(`  !! OneMap failed for ${postal} after ${attempt} attempts`);
        return null;
      }
      await sleep(1500 * attempt);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Downloading CSV...");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);
  const csv = await res.text();
  const rows = parseCsv(csv);
  console.log(`Downloaded ${rows.length} raw rows`);

  const arcades = [];
  let currentChain = null;
  for (const row of rows) {
    const [colName, colMrt, colHours, colShelter, colAddr, colMaimai, colChunithm, colOther] = row;
    const name = (colName || "").trim();
    const hasData = (colMrt || "").trim() && (colAddr || "").trim();

    // Chain section row: single non-empty cell naming a known chain
    if (!hasData && CHAINS.includes(name)) {
      currentChain = name;
      continue;
    }
    // Skip header / note / blank rows
    if (!hasData || (colMrt || "").trim() === "Nearest MRT/LRT") continue;

    // Name footnotes: (*) higher maimai pricing, (^) accepts 100 yen-medals
    const higherPricing = name.includes("*");
    const yenMedals = name.includes("^");
    const branch = name.replace(/[*^]+/g, "").trim().replace(/\n+/g, " ");

    // Hours footnote: (^) may open later than stipulated
    const hoursRaw = (colHours || "").replace(/\r/g, "");
    const mayOpenLate = hoursRaw.includes("^");
    const hours = hoursRaw
      .split(/\n+/)
      .map((l) => l.replace(/\^/g, "").trim())
      .filter(Boolean);

    const { sheltered, shelteredNote } = parseSheltered(colShelter);
    const { address, postal } = parseAddress(colAddr);
    const { games: otherGames, extras } = parseOtherGames(colOther);

    const games = {
      maimai: parseCabCount(colMaimai),
      chunithm: parseCabCount(colChunithm),
      ...Object.fromEntries(GAME_KEYS.slice(2).map((k) => [k, 0])),
      ...otherGames,
    };

    arcades.push({
      name: `${currentChain} – ${branch}`,
      chain: currentChain || "Other",
      branch,
      mrt: (colMrt || "").replace(/\r/g, "").trim(),
      hours,
      mayOpenLate,
      sheltered,
      shelteredNote,
      address,
      postal,
      lat: null,
      lng: null,
      region: null,
      planningArea: null,
      higherPricing,
      yenMedals,
      games,
      extraGames: extras.length ? extras : undefined,
    });
  }
  console.log(`Parsed ${arcades.length} arcade rows`);

  const cache = await loadCache();
  let geoFail = 0;
  for (const a of arcades) {
    if (!a.postal) {
      console.warn(`  !! no postal code: ${a.name}`);
      geoFail++;
      continue;
    }
    const geo = await geocode(cache, a.postal);
    if (geo) {
      a.lat = geo.lat;
      a.lng = geo.lng;
    } else {
      geoFail++;
      console.warn(`  !! geocode failed: ${a.name} (${a.postal})`);
    }
    await sleep(400); // be polite to OneMap
  }
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
  if (geoFail) console.warn(`${geoFail} arcades missing coordinates`);

  let missingArea = 0;
  for (const a of arcades) {
    const area = a.postal && AREA_MAP[a.postal];
    if (area) {
      a.region = area.region;
      a.planningArea = area.planningArea;
    } else {
      missingArea++;
      console.warn(`  ?? no AREA_MAP entry for ${a.name} (postal ${a.postal})`);
    }
  }
  if (missingArea) console.warn(`${missingArea} arcades missing region/planningArea`);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(arcades, null, 2) + "\n");
  console.log(`Wrote ${arcades.length} arcades to ${path.relative(ROOT, OUT_PATH)}`);
  const chains = {};
  for (const a of arcades) chains[a.chain] = (chains[a.chain] || 0) + 1;
  console.log("Chains:", JSON.stringify(chains));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
