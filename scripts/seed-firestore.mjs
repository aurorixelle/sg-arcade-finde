// One-time (or re-runnable) Firestore seeding, run locally.
//
//   node scripts/seed-firestore.mjs --import            # arcades.json -> Firestore arcades collection
//   node scripts/seed-firestore.mjs --make-admin email  # set admin flag on a user's profile
//
// Requires scripts/service-account.json:
// Firebase console → Project settings → Service accounts → Generate new private key

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY_PATH = path.join(ROOT, "scripts", "service-account.json");

if (!existsSync(KEY_PATH)) {
  console.error(`Missing ${path.relative(ROOT, KEY_PATH)}.`);
  console.error("Firebase console → Project settings → Service accounts → Generate new private key, save it there.");
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(await readFile(KEY_PATH, "utf8"))) });

const db = getFirestore();

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
  const user = await getAuth().getUserByEmail(email);
  const ref = db.collection("users").doc(user.uid);
  await ref.set({ admin: true }, { merge: true });
  console.log(`Admin flag set for ${email} (uid ${user.uid}).`);
}

async function removeAdmin(email) {
  const user = await getAuth().getUserByEmail(email);
  const ref = db.collection("users").doc(user.uid);
  await ref.set({ admin: false }, { merge: true });
  console.log(`Admin flag removed for ${email} (uid ${user.uid}).`);
}

async function listUsers() {
  const list = await getAuth().listUsers(100);
  if (list.users.length === 0) {
    console.log("No registered users yet.");
    return;
  }
  // join with Firestore profile docs to show admin flags
  const profiles = {};
  const snap = await db.collection("users").get();
  for (const d of snap.docs) profiles[d.id] = d.data();
  for (const u of list.users) {
    const p = profiles[u.uid] || {};
    console.log(`  ${u.email}  verified=${u.emailVerified}  admin=${p.admin === true}  favorites=${(p.favorites || []).length}`);
  }
}

// Publish firestore.rules via the Firebase Rules API, using the Admin SDK's own
// credential (it already proves token minting works — Firestore seeding used it).
async function publishRules() {
  const content = await readFile(path.join(ROOT, "firestore.rules"), "utf8");
  const sa = JSON.parse(await readFile(KEY_PATH, "utf8"));
  const projectId = sa.project_id;

  const app = getApps()[0];
  // note: the Admin SDK credential returns { access_token } (snake_case)
  const { access_token: token } = await app.options.credential.getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    { method: "POST", headers, body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content }] } }) }
  );
  if (!rulesetRes.ok) throw new Error(`create ruleset failed: HTTP ${rulesetRes.status} ${await rulesetRes.text()}`);
  const { name: rulesetName } = await rulesetRes.json();

  // PATCH creates or updates the release attached to Cloud Firestore
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
    { method: "PATCH", headers, body: JSON.stringify({ name: "cloud.firestore", rulesetName }) }
  );
  if (!releaseRes.ok) throw new Error(`update release failed: HTTP ${releaseRes.status} ${await releaseRes.text()}`);
  console.log(`Rules published: ${rulesetName} -> release cloud.firestore`);
}

const [,, ...args] = process.argv;
try {
  if (args[0] === "--import") {
    await importArcades();
  } else if (args[0] === "--make-admin" && args[1]) {
    await makeAdmin(args[1]);
  } else if (args[0] === "--remove-admin" && args[1]) {
    await removeAdmin(args[1]);
  } else if (args[0] === "--list-users") {
    await listUsers();
  } else if (args[0] === "--publish-rules") {
    await publishRules();
  } else {
    console.log("Usage:\n  node scripts/seed-firestore.mjs --import\n  node scripts/seed-firestore.mjs --make-admin <email>\n  node scripts/seed-firestore.mjs --remove-admin <email>\n  node scripts/seed-firestore.mjs --list-users\n  node scripts/seed-firestore.mjs --publish-rules");
  }
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}
