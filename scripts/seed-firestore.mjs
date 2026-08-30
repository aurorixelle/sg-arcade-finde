// One-time (or re-runnable) Firestore seeding, run locally.
//
//   node scripts/seed-firestore.mjs --import            # arcades.json -> Firestore arcades collection
//   node scripts/seed-firestore.mjs --make-admin email  # set admin flag on a user's profile
//
// Requires scripts/service-account.json:
// Firebase console → Project settings → Service accounts → Generate new private key

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY_PATH = path.join(ROOT, "scripts", "service-account.json");

if (!existsSync(KEY_PATH)) {
  console.error(`Missing ${path.relative(ROOT, KEY_PATH)}.`);
  console.error("Firebase console → Project settings → Service accounts → Generate new private key, save it there.");
  process.exit(1);
}

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(await readFile(KEY_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function importArcades() {
  const data = JSON.parse(await readFile(path.join(ROOT, "src", "data", "arcades.json"), "utf8"));
  let count = 0;
  for (const arcade of data) {
    const id = slugify(arcade.name);
    await db.collection("arcades").doc(id).set(arcade);
    count++;
    process.stdout.write(`  ${id}\n`);
  }
  console.log(`Imported ${count} arcades.`);
  console.log("NOTE: import overwrites any manual edits made in the admin panel for these docs.");
}

async function makeAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  const ref = db.collection("users").doc(user.uid);
  await ref.set({ admin: true }, { merge: true });
  console.log(`Admin flag set for ${email} (uid ${user.uid}).`);
}

const [,, ...args] = process.argv;
try {
  if (args[0] === "--import") {
    await importArcades();
  } else if (args[0] === "--make-admin" && args[1]) {
    await makeAdmin(args[1]);
  } else {
    console.log("Usage:\n  node scripts/seed-firestore.mjs --import\n  node scripts/seed-firestore.mjs --make-admin <email>");
  }
} finally {
  process.exit(0);
}
