import { GAMES, REGIONS } from "../constants.js";
import { IconChevron } from "./icons.jsx";

export default function FilterBar({
  arcades,
  region,
  planningArea,
  chain,
  chains,
  selectedGames,
  onRegionChange,
  onPlanningAreaChange,
  onChainChange,
  onToggleGame,
  onReset,
  open = true,
  onToggle,
  activeCount = 0,
}) {
  // Planning areas within the selected region (or all areas when no region)
  const areaOptions = [...new Set(
    arcades
      .filter((a) => !region || a.region === region)
      .map((a) => a.planningArea)
  )].sort();

  const gameCounts = {};
  for (const g of GAMES) {
    gameCounts[g.key] = arcades.filter((a) => a.games[g.key] > 0).length;
  }

  return (
    <div className={`filter-bar ${open ? "open" : ""}`}>
      {/* Mobile-only collapse toggle; hidden on desktop where filters stay open */}
      <button type="button" className="filter-toggle" onClick={onToggle} aria-expanded={open}>
        <IconChevron size={16} className={open ? "chevron-up" : ""} />
        Filters
        {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
      </button>

      <div className="filter-row">
        <label className="filter-field">
          <span>Region</span>
          <select value={region} onChange={(e) => onRegionChange(e.target.value)}>
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Planning Area</span>
          <select value={planningArea} onChange={(e) => onPlanningAreaChange(e.target.value)}>
            <option value="">All areas</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Arcade Chain</span>
          <select value={chain} onChange={(e) => onChainChange(e.target.value)}>
            <option value="">All chains</option>
            {chains.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-row">
        <span className="filter-field-label">Games</span>
        <div className="game-chips">
          {GAMES.map((g) => {
            const active = selectedGames.has(g.key);
            return (
              <button
                key={g.key}
                type="button"
                className={`game-chip ${active ? "active" : ""} ${gameCounts[g.key] === 0 ? "empty" : ""}`}
                onClick={() => onToggleGame(g.key)}
                title={`${gameCounts[g.key]} arcade(s) have ${g.label}`}
              >
                {g.label}
                <em>{gameCounts[g.key]}</em>
              </button>
            );
          })}
        </div>
        <button type="button" className="reset-btn" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
