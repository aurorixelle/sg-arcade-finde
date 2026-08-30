// temp: end-to-end rules test with a throwaway user
// 1) what release is attached  2) can a signed-in user read their profile doc
// 3) can a non-admin write arcades (should be denied)  4) cleanup
import { readFile } from "node:fs/promises";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const sa = JSON.parse(await readFile("scripts/service-account.json", "utf8"));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });

const admin = { auth: getAuth(), db: getFirestore() };
const { access_token: token } = await getApps()[0].options.credential.getAccessToken();
const headers = { Authorization: `Bearer ${token}` };
const apiKey = "AIzaSyAY_aDI7Z2NuJBvE_xRzJ_WQ6Dkkt0Sd7c"; // public web API key (from src/firebase-config.js)

// 1) which ruleset is attached to cloud.firestore
try {
  const rel = await (await fetch(`https://firebaserules.googleapis.com/v1/projects/${sa.project_id}/releases/cloud.firestore`, { headers })).json();
  console.log("[1] attached ruleset:", rel.rulesetName || JSON.stringify(rel).slice(0, 120));
} catch (e) {
  console.log("[1] releases GET failed:", e.message);
}

// 2) create throwaway user and sign in via REST
const TEST_EMAIL = `rules-test-${Date.now()}@example.com`;
const TEST_PASS = "test123456";
const u = await admin.auth.createUser({ email: TEST_EMAIL, password: TEST_PASS, emailVerified: true });
console.log("[2] test user created:", TEST_EMAIL);

const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS, returnSecureToken: true }),
});
const { idToken } = await signIn.json();
if (!idToken) { console.log("[2] sign-in FAILED — cannot test rules"); process.exit(1); }
console.log("[2] signed in via REST ok");

// 3) read own users doc through live rules
const readRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/users/${u.uid}`,
  { headers: { Authorization: `Bearer ${idToken}` } }
);
console.log("[3] read own users doc ->", readRes.status, readRes.status === 403 ? "DENIED (rules problem)" : readRes.status === 404 ? "allowed (doc missing, that's fine)" : "allowed");

// 4) try writing an arcade doc as non-admin (should be denied)
const writeRes = await fetch(
  `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/arcades/hack-test`,
  {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { hacked: { stringValue: "true" } } }),
  }
);
console.log("[4] non-admin write arcades ->", writeRes.status, writeRes.status === 403 ? "DENIED (correct!)" : "!!! ALLOWED — SECURITY HOLE");

// cleanup
await admin.auth.deleteUser(u.uid);
await admin.db.doc(`users/${u.uid}`).delete().catch(() => {});
console.log("[cleanup] test user deleted");
