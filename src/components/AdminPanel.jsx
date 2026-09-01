import { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, slugify } from "../firebase.js";
import { GAMES, CHAIN_COLORS, REGIONS, STATUS_BY_KEY } from "../constants.js";
import { getGameEntry, summarizeGame } from "../utils/status.js";
import MachineStatusEditor from "./MachineStatusEditor.jsx";

function emptyArcade() {
  return {
    name: "",
    chain: "Virtualand",
    branch: "",
    mrt: "",
    hours: [""],
    mayOpenLate: false,
    sheltered: true,
    shelteredNote: "",
    address: "",
    postal: "",
    lat: 1.3521,
    lng: 103.8198,
    region: "Central",
    planningArea: "",
    higherPricing: false,
    yenMedals: false,
    games: Object.fromEntries(GAMES.map((g) => [g.key, 0])),
    extraGames: [],
  };
}

// One Arcade record editor. initial = existing arcade object or null (new).
function ArcadeForm({ initial, onDone, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = initial ?? emptyArcade();
    return {
      ...base,
      hours: base.hours.join("\n"),
      extraGames: (base.extraGames ?? []).join(", "),
      shelteredNote: base.shelteredNote ?? "",
      prices: base.prices ?? {},
    };
  });
  const isNew = !initial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const record = {
        name: form.name.trim(),
        chain: form.chain,
        branch: form.branch.trim(),
        mrt: form.mrt.trim(),
        hours: form.hours.split(/\n+/).map((l) => l.trim()).filter(Boolean),
        mayOpenLate: !!form.mayOpenLate,
        sheltered: !!form.sheltered,
        shelteredNote: form.shelteredNote.trim() || null,
        address: form.address.trim(),
        postal: String(form.postal).trim(),
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        region: form.region,
        planningArea: form.planningArea.trim(),
        higherPricing: !!form.higherPricing,
        yenMedals: !!form.yenMedals,
        games: Object.fromEntries(GAMES.map((g) => [g.key, Math.max(0, parseInt(form.games[g.key] || 0, 10) || 0)])),
        extraGames: form.extraGames.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        prices: Object.fromEntries(
          GAMES.map((g) => [g.key, (form.prices?.[g.key] ?? "").trim()]).filter(([, v]) => v !== "")
        ),
      };
      if (!record.name || !record.postal || !record.planningArea) {
        throw new Error("Name, postal, and planning area are required");
      }
      if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng)) {
        throw new Error("Invalid latitude/longitude");
      }
      const id = initial?.id ?? slugify(record.name);
      // merge: fields this form does not manage (machineStatus, …) survive the save
      await setDoc(doc(db, "arcades", id), record, { merge: true });
      onDone();
    } catch (err) {
      setError(err.message?.replace("Firebase: ", "") || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSave}>
      <div className="admin-form-head">
        <h3>{isNew ? "New arcade" : `Edit ${initial.branch}`}</h3>
        <button type="button" className="clear-btn" onClick={onCancel}>← Back to list</button>
      </div>

      <div className="admin-grid">
        <label><span>Name *</span>
          <input required value={form.name} onChange={set("name")} placeholder="Virtualand – Bugis+" /></label>
        <label><span>Chain</span>
          <select value={form.chain} onChange={set("chain")}>
            {Object.keys(CHAIN_COLORS).map((c) => <option key={c}>{c}</option>)}
          </select></label>
        <label><span>Branch</span>
          <input value={form.branch} onChange={set("branch")} placeholder="Bugis+" /></label>
        <label><span>Postal *</span>
          <input required value={form.postal} onChange={set("postal")} placeholder="188067" /></label>
        <label><span>Region</span>
          <select value={form.region} onChange={set("region")}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select></label>
        <label><span>Planning Area *</span>
          <input required value={form.planningArea} onChange={set("planningArea")} placeholder="Downtown Core" /></label>
        <label><span>Latitude</span>
          <input type="number" step="any" value={form.lat} onChange={set("lat")} /></label>
        <label><span>Longitude</span>
          <input type="number" step="any" value={form.lng} onChange={set("lng")} /></label>
        <label className="span-2"><span>Address</span>
          <input value={form.address} onChange={set("address")} placeholder="201 Victoria St #05-04" /></label>
        <label className="span-2"><span>MRT (multiple lines allowed)</span>
          <textarea rows={2} value={form.mrt} onChange={set("mrt")} placeholder="EW12/DT14 Bugis (Exit C)" /></label>
        <label className="span-2"><span>Operating hours (one per line)</span>
          <textarea rows={4} value={form.hours} onChange={set("hours")} placeholder={"11:30am - 10pm (Mon - Thu)\n11am - 11pm (Fri & Sat)"} /></label>
        <label className="span-2"><span>Sheltered note</span>
          <input value={form.shelteredNote} onChange={set("shelteredNote")} placeholder="bus from Pasir Ris Int (optional)" /></label>
      </div>

      <div className="admin-checks">
        <label><input type="checkbox" checked={form.sheltered} onChange={set("sheltered")} /> Sheltered walkway</label>
        <label><input type="checkbox" checked={form.mayOpenLate} onChange={set("mayOpenLate")} /> May open late</label>
        <label><input type="checkbox" checked={form.higherPricing} onChange={set("higherPricing")} /> Higher maimai pricing (legacy footnote)</label>
        <label><input type="checkbox" checked={form.yenMedals} onChange={set("yenMedals")} /> Accepts yen medals</label>
      </div>

      <fieldset className="admin-games">
        <legend>Cabinet count</legend>
        {GAMES.map((g) => (
          <label key={g.key}>
            <span>{g.label}</span>
            <input
              type="number" min={0} value={form.games[g.key]}
              onChange={(e) => setForm((f) => ({ ...f, games: { ...f.games, [g.key]: e.target.value } }))}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className="admin-games admin-prices">
        <legend>Prices (free text per game)</legend>
        {GAMES.map((g) => (
          <label key={g.key}>
            <span>{g.label}</span>
            <input
              value={form.prices[g.key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, prices: { ...f.prices, [g.key]: e.target.value } }))}
              placeholder="e.g. 14 tokens / 4 medals"
            />
          </label>
        ))}
      </fieldset>

      <label className="admin-extra"><span>Other games (comma-separated)</span>
        <input value={form.extraGames} onChange={set("extraGames")} placeholder="Reflec Beat, Nostalgia" /></label>

      {error && <p className="form-error">{error}</p>}
      <div className="admin-actions">
        <button type="submit" className="submit-btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="clear-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// Worst-status emoji for the table's count cells, or "" when no status data.
function worstEmoji(a, gameKey) {
  const s = summarizeGame(getGameEntry(a, gameKey));
  return s ? ` ${STATUS_BY_KEY[s.worst].emoji}` : "";
}

export default function AdminPanel({ arcades, onExit }) {
  const [editing, setEditing] = useState(null); // null = list, "new" or arcade object
  const [statusEditing, setStatusEditing] = useState(null); // null or arcade object
  const [error, setError] = useState(null);

  async function handleDelete(a) {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "arcades", a.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (statusEditing !== null) {
    return (
      <section className="admin-panel">
        <MachineStatusEditor
          key={statusEditing.id}
          arcade={statusEditing}
          onDone={() => setStatusEditing(null)}
          onCancel={() => setStatusEditing(null)}
        />
      </section>
    );
  }

  if (editing !== null) {
    return (
      <section className="admin-panel">
        <ArcadeForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-form-head">
        <h2>Manage data · {arcades.length} arcades</h2>
        <div>
          <button type="button" className="submit-btn" onClick={() => setEditing("new")}>+ New</button>
          <button type="button" className="clear-btn" onClick={onExit}>← Back to map</button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Chain</th><th>Area</th><th>maimai</th><th>CHUNITHM</th><th>Others</th><th></th></tr>
          </thead>
          <tbody>
            {arcades.map((a) => (
              <tr key={a.id}>
                <td>{a.branch}</td>
                <td><span className="chain-badge" style={{ background: CHAIN_COLORS[a.chain] || "#64748b" }}>{a.chain}</span></td>
                <td>{a.planningArea}</td>
                <td className="num">{a.games.maimai}{worstEmoji(a, "maimai")}</td>
                <td className="num">{a.games.chunithm}{worstEmoji(a, "chunithm")}</td>
                <td className="dim">
                  {GAMES.slice(2).filter((g) => a.games[g.key] > 0).map((g) => g.label).join(", ") || "—"}
                </td>
                <td className="row-actions">
                  <button type="button" onClick={() => setEditing(a)}>Edit</button>
                  <button type="button" onClick={() => setStatusEditing(a)}>Status</button>
                  <button type="button" className="danger" onClick={() => handleDelete(a)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
