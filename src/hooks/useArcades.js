import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import staticData from "../data/arcades.json";
import { db, firebaseReady, slugify } from "../firebase.js";

// Arcade directory source: live Firestore when configured, with the bundled
// JSON snapshot as fallback (also the mode before Firebase is set up, or if
// the read fails). Every entry gets a stable `id` either way.
export function useArcades() {
  const [arcades, setArcades] = useState(() =>
    staticData.map((a) => ({ ...a, id: a.id ?? slugify(a.name) }))
  );
  const [source, setSource] = useState("snapshot");

  useEffect(() => {
    if (!firebaseReady || !db) return undefined;
    const unsub = onSnapshot(
      collection(db, "arcades"),
      (snap) => {
        if (snap.empty) return; // empty collection -> keep the snapshot
        setArcades(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        setSource("firestore");
      },
      (err) => console.warn("Firestore read failed, using bundled snapshot:", err.message)
    );
    return () => unsub();
  }, []);

  const sorted = useMemo(() => [...arcades].sort((a, b) => a.name.localeCompare(b.name)), [arcades]);
  return { arcades: sorted, source };
}
