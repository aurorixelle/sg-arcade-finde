// Update the game version on every arcade's machineStatus entry (e.g. when
// maimai bumps from 1.65-A to 1.65-B).
//
//   node scripts/set-version.mjs <game> <version>          # dry run: report only
//   node scripts/set-version.mjs <game> <version> --write  # apply (Firestore merge + arcades.json)
//
// Example: node scripts/set-version.mjs maimai 1.65-B --write
// Firestore writes need scripts/service-account.json; merge keeps all other
// fields (cabs, notes, asOf) untouched.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "src", "data", "arcades.json");
const KEY_PATH = path.join(ROOT, "scripts", "service-account.json");

const [game, version, ...rest] = process.argv.slice(2);
const WRITE = rest.includes("--write");

if (!game || !version || !["maimai", "chunithm"].includes(game)) {
  console.error("Usage: node scripts/set-version.mjs <maimai|chunithm> <version> [--write]");
  process.exit(1);
}

const arcades = JSON.parse(await readFile(JSON_PATH, "utf8"));

// Firestore is the source of truth (admins can add arcades that aren't in the
// bundled JSON snapshot), so collect targets there when possible.
let targets; // [{ id, current }]
if (existsSync(KEY_PATH)) {
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  initializeApp({ credential: cert(JSON.parse(await readFile(KEY_PATH, "utf8"))) });
  const db = getFirestore();
  const snap = await db.collection("arcades").get();
  targets = snap.docs
    .map((d) => ({ id: d.id, current: d.data().machineStatus?.[game]?.version }))
    .filter((t) => t.current !== undefined);
} else {
  console.warn(`(No service account — reporting from ${path.relative(ROOT, JSON_PATH)} only.)`);
  targets = arcades
    .filter((a) => a.machineStatus?.[game])
    .map((a) => ({ id: slugify(a.name), current: a.machineStatus[game].version }));
}

if (!targets.length) {
  console.log(`No arcade has machineStatus.${game} — nothing to do.`);
  process.exit(0);
}

for (const t of targets) {
  console.log(`${t.current === version ? "[same]" : "[bump ]"} ${t.id}: ${t.current || "(none)"} -> ${version}`);
}
const changing = targets.filter((t) => t.current !== version);
console.log(`\n${targets.length} docs have ${game} status, ${changing.length} would change.`);

if (!WRITE) {
  console.log("Dry run — nothing written. Re-run with --write to apply.");
  process.exit(0);
}

// arcades.json (keeps the snapshot fallback in sync)
const jsonIds = new Set(targets.map((t) => t.id));
let jsonUpdated = 0;
for (const a of arcades) {
  const id = slugify(a.name);
  if (jsonIds.has(id) && a.machineStatus?.[game]) {
    a.machineStatus[game].version = version;
    jsonUpdated++;
  }
}
await writeFile(JSON_PATH, JSON.stringify(arcades, null, 2) + "\n");
console.log(`Updated ${path.relative(ROOT, JSON_PATH)} (${jsonUpdated} arcades)`);

// Firestore merge writes (deep merge: only the version field moves)
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore();
let n = 0;
for (const t of targets) {
  await db.collection("arcades").doc(t.id).set(
    { machineStatus: { [game]: { version } } },
    { merge: true }
  );
  n++;
}
console.log(`Firestore: set ${game} version "${version}" on ${n} docs.`);
