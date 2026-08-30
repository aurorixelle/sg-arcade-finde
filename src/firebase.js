import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config.js";

// False while the config in firebase-config.js is still a placeholder:
// the site then runs in account-less mode on the bundled data snapshot.
export const firebaseReady = !/^PASTE_HERE$/.test(firebaseConfig.apiKey);

let app = null;
let auth = null;
let db = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

// Stable document id from an arcade's name, e.g.
// "Virtualand – Bugis+" -> "virtualand-bugis"
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
