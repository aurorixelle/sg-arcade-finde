import { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, slugify } from "../firebase.js";
import { GAMES, CHAIN_COLORS, REGIONS } from "../constants.js";

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
      };
      if (!record.name || !record.postal || !record.planningArea) {
        throw new Error("名称、邮编、规划区必填 Name, postal, planning area are required");
      }
      if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng)) {
        throw new Error("经纬度无效 Invalid lat/lng");
      }
      const id = initial?.id ?? slugify(record.name);
      await setDoc(doc(db, "arcades", id), record);
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
        <h3>{isNew ? "新增街机厅 New arcade" : `编辑 ${initial.branch}`}</h3>
        <button type="button" className="clear-btn" onClick={onCancel}>← 返回列表</button>
      </div>

      <div className="admin-grid">
        <label><span>名称 Name *</span>
          <input required value={form.name} onChange={set("name")} placeholder="Virtualand – Bugis+" /></label>
        <label><span>连锁 Chain</span>
          <select value={form.chain} onChange={set("chain")}>
            {Object.keys(CHAIN_COLORS).map((c) => <option key={c}>{c}</option>)}
          </select></label>
        <label><span>分店 Branch</span>
          <input value={form.branch} onChange={set("branch")} placeholder="Bugis+" /></label>
        <label><span>邮编 Postal *</span>
          <input required value={form.postal} onChange={set("postal")} placeholder="188067" /></label>
        <label><span>区域 Region</span>
          <select value={form.region} onChange={set("region")}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select></label>
        <label><span>规划区 Planning Area *</span>
          <input required value={form.planningArea} onChange={set("planningArea")} placeholder="Downtown Core" /></label>
        <label><span>纬度 Latitude</span>
          <input type="number" step="any" value={form.lat} onChange={set("lat")} /></label>
        <label><span>经度 Longitude</span>
          <input type="number" step="any" value={form.lng} onChange={set("lng")} /></label>
        <label className="span-2"><span>地址 Address</span>
          <input value={form.address} onChange={set("address")} placeholder="201 Victoria St #05-04" /></label>
        <label className="span-2"><span>MRT（可多行）</span>
          <textarea rows={2} value={form.mrt} onChange={set("mrt")} placeholder="EW12/DT14 Bugis (Exit C)" /></label>
        <label className="span-2"><span>营业时间（每行一条）</span>
          <textarea rows={4} value={form.hours} onChange={set("hours")} placeholder={"11:30am - 10pm (Mon - Thu)\n11am - 11pm (Fri & Sat)"} /></label>
        <label className="span-2"><span>遮蔽步道备注 Sheltered note</span>
          <input value={form.shelteredNote} onChange={set("shelteredNote")} placeholder="bus from Pasir Ris Int（可空）" /></label>
      </div>

      <div className="admin-checks">
        <label><input type="checkbox" checked={form.sheltered} onChange={set("sheltered")} /> 遮蔽步道 Sheltered</label>
        <label><input type="checkbox" checked={form.mayOpenLate} onChange={set("mayOpenLate")} /> 可能晚开 May open late</label>
        <label><input type="checkbox" checked={form.higherPricing} onChange={set("higherPricing")} /> 高价 maimai Higher pricing</label>
        <label><input type="checkbox" checked={form.yenMedals} onChange={set("yenMedals")} /> 收日元 medal Yen medals</label>
      </div>

      <fieldset className="admin-games">
        <legend>机台数 Cab count</legend>
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

      <label className="admin-extra"><span>其他游戏（逗号分隔）Other games</span>
        <input value={form.extraGames} onChange={set("extraGames")} placeholder="Reflec Beat, Nostalgia" /></label>

      {error && <p className="form-error">{error}</p>}
      <div className="admin-actions">
        <button type="submit" className="submit-btn" disabled={busy}>{busy ? "保存中…" : "保存 Save"}</button>
        <button type="button" className="clear-btn" onClick={onCancel}>取消</button>
      </div>
    </form>
  );
}

export default function AdminPanel({ arcades, onExit }) {
  const [editing, setEditing] = useState(null); // null = list, "new" or arcade object
  const [error, setError] = useState(null);

  async function handleDelete(a) {
    if (!window.confirm(`确定删除 Delete "${a.name}"？`)) return;
    try {
      await deleteDoc(doc(db, "arcades", a.id));
    } catch (err) {
      setError(err.message);
    }
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
        <h2>数据管理 · {arcades.length} arcades</h2>
        <div>
          <button type="button" className="submit-btn" onClick={() => setEditing("new")}>+ 新增 New</button>
          <button type="button" className="clear-btn" onClick={onExit}>← 返回地图</button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>名称</th><th>连锁</th><th>区域</th><th>maimai</th><th>CHUNITHM</th><th>其他</th><th></th></tr>
          </thead>
          <tbody>
            {arcades.map((a) => (
              <tr key={a.id}>
                <td>{a.branch}</td>
                <td><span className="chain-badge" style={{ background: CHAIN_COLORS[a.chain] || "#64748b" }}>{a.chain}</span></td>
                <td>{a.planningArea}</td>
                <td className="num">{a.games.maimai}</td>
                <td className="num">{a.games.chunithm}</td>
                <td className="dim">
                  {GAMES.slice(2).filter((g) => a.games[g.key] > 0).map((g) => g.label).join(", ") || "—"}
                </td>
                <td className="row-actions">
                  <button type="button" onClick={() => setEditing(a)}>编辑</button>
                  <button type="button" className="danger" onClick={() => handleDelete(a)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
