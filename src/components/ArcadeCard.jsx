import { GAMES, CHAIN_COLORS } from "../constants.js";
import { formatDistance } from "../utils/geo.js";

export default function ArcadeCard({ arcade, distance, selected, onSelect }) {
  const chainColor = CHAIN_COLORS[arcade.chain] || "#64748b";
  const available = GAMES.filter((g) => arcade.games[g.key] > 0);

  return (
    <article
      className={`arcade-card ${selected ? "selected" : ""}`}
      style={{ borderLeftColor: chainColor }}
      onClick={onSelect}
      data-arcade={arcade.name}
    >
      <header>
        <h3>{arcade.branch}</h3>
        <span className="chain-badge" style={{ background: chainColor }}>
          {arcade.chain}
        </span>
        {distance != null && (
          <span className="distance-badge">{formatDistance(distance)}</span>
        )}
      </header>

      <div className="card-meta">
        <div className="meta-row" title="Nearest MRT/LRT">
          <span className="meta-label">MRT</span>
          <span className="meta-value pre-wrap">{arcade.mrt}</span>
        </div>
        <div className="meta-row" title="Operating hours">
          <span className="meta-label">Hours</span>
          <span className="meta-value pre-wrap">
            {arcade.hours.join("\n")}
            {arcade.mayOpenLate && (
              <span className="footnote"> (may open later than stipulated)</span>
            )}
          </span>
        </div>
        <div className="meta-row" title="Fully sheltered walkway from MRT">
          <span className="meta-label">Sheltered</span>
          <span className="meta-value">
            {arcade.sheltered ? "✅" : "❌"}
            {arcade.shelteredNote && (
              <span className="footnote"> ({arcade.shelteredNote})</span>
            )}
          </span>
        </div>
        <div className="meta-row" title="Address">
          <span className="meta-label">Address</span>
          <span className="meta-value">
            {arcade.address}, Singapore {arcade.postal}
          </span>
        </div>
      </div>

      <div className="game-badges">
        {available.map((g) => (
          <span key={g.key} className={`game-badge g-${g.key}`}>
            {g.label}
            {arcade.games[g.key] > 1 && <strong>×{arcade.games[g.key]}</strong>}
          </span>
        ))}
        {arcade.extraGames?.map((g) => (
          <span key={g} className="game-badge extra">{g}</span>
        ))}
      </div>

      {(arcade.higherPricing || arcade.yenMedals) && (
        <div className="pricing-notes">
          {arcade.higherPricing && (
            <span>※ maimai pricing here: 14 tokens / 4 medals</span>
          )}
          {arcade.yenMedals && (
            <span>¥ maimai cabinets accept 100 yen-medals</span>
          )}
        </div>
      )}
    </article>
  );
}
