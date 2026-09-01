import { useEffect, useRef } from "react";
import { CHAINS, CHAIN_COLORS, GAMES, STATUS, STATUS_BY_KEY, STATUS_GAMES } from "../constants.js";
import { arcadeHasStatus, formatDate, getGameEntry, summarizeGame } from "../utils/status.js";

const GAME_LABEL = Object.fromEntries(GAMES.map((g) => [g.key, g.label]));
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc/htmlview";

function CabCell({ cab }) {
  const status = STATUS_BY_KEY[cab.status] ?? STATUS_BY_KEY.unknown;
  return (
    <div
      className={`cab-cell s-${status.key}`}
      title={cab.note || `${cab.id} ${cab.side ?? ""}`.trim()}
    >
      <div className="cab-head">
        <strong>{cab.id}</strong>
        {cab.side && <span className="cab-side">{cab.side}</span>}
        <span className="cab-status" aria-label={status.short}>{status.emoji}</span>
      </div>
      {cab.note && <p className="cab-note">{cab.note}</p>}
      <span className="cab-date">
        {cab.reportedAt ? `reported ${formatDate(cab.reportedAt)}` : "no report date"}
      </span>
    </div>
  );
}

function GameStatusBlock({ gameKey, entry }) {
  const sum = summarizeGame(entry);
  if (!sum) return null;
  return (
    <div className="game-status">
      <div className="game-status-head">
        <span className={`game-badge g-${gameKey}`}>{GAME_LABEL[gameKey]}</span>
        {entry.version && <span className="version-chip">v{entry.version}</span>}
        <span className="game-status-sum">{sum.ok}/{sum.total} OK</span>
        {entry.asOf && <span className="as-of">info as of {formatDate(entry.asOf)}</span>}
      </div>
      {entry.notes && <p className="game-status-notes">{entry.notes}</p>}
      <div className="cab-grid">
        {(entry.cabs ?? []).map((cab, i) => (
          <CabCell key={`${cab.id}-${cab.side ?? "x"}-${i}`} cab={cab} />
        ))}
      </div>
    </div>
  );
}

// Public machine-status view, mirroring the sheet's chain → location → cab grid.
export default function StatusView({ arcades, focus, onExit }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!focus || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-status-arcade="${CSS.escape(focus)}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

  const sections = CHAINS
    .map((chain) => ({ chain, list: arcades.filter((a) => a.chain === chain && arcadeHasStatus(a)) }))
    .filter((s) => s.list.length > 0);

  return (
    <section className="status-view" ref={listRef}>
      <div className="admin-form-head">
        <h2>Machine status</h2>
        <button type="button" className="clear-btn" onClick={onExit}>← Back to map</button>
      </div>

      <div className="status-legend">
        {STATUS.map((s) => (
          <span key={s.key}>{s.emoji} {s.label}</span>
        ))}
        <span className="dim-note">
          Statuses change only when admins update them; “reported” dates are the last community report.
        </span>
      </div>

      {sections.length === 0 && (
        <p className="empty-state">No machine status recorded yet.</p>
      )}

      {sections.map(({ chain, list }) => (
        <section key={chain} className="status-chain">
          <h3><i style={{ background: CHAIN_COLORS[chain] }} /> {chain}</h3>
          {list.map((a) => (
            <article
              key={a.id ?? a.name}
              className={`status-arcade ${focus === a.id ? "focused" : ""}`}
              data-status-arcade={a.id ?? a.name}
            >
              <header>
                <h4>{a.branch}</h4>
                <span className="chain-badge" style={{ background: CHAIN_COLORS[a.chain] || "#64748b" }}>
                  {a.chain}
                </span>
                {STATUS_GAMES.map((gk) =>
                  a.prices?.[gk] ? (
                    <span key={gk} className="price-chip">{GAME_LABEL[gk]}: {a.prices[gk]}</span>
                  ) : null
                )}
              </header>
              {STATUS_GAMES.map((gk) => {
                const entry = getGameEntry(a, gk);
                return entry ? <GameStatusBlock key={gk} gameKey={gk} entry={entry} /> : null;
              })}
            </article>
          ))}
        </section>
      ))}

      <p className="sheet-link">
        Originally sourced from the{" "}
        <a href={SHEET_URL} target="_blank" rel="noreferrer">maimai &amp; CHUNITHM SG public sheet</a>.
      </p>
    </section>
  );
}
