import { RADIUS_OPTIONS } from "../constants.js";
import { formatDistance } from "../utils/geo.js";

export default function NearMePanel({
  userPos,
  locating,
  geoError,
  nearest,
  radius,
  onLocate,
  onRadiusChange,
  onClear,
}) {
  return (
    <div className="nearme-panel">
      <div className="nearme-controls">
        {!userPos ? (
          <button
            type="button"
            className="locate-btn"
            onClick={onLocate}
            disabled={locating}
          >
            {locating ? "Locating…" : "📍 Use my location"}
          </button>
        ) : (
          <>
            <span className="located-text">
              📍 {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}
            </span>
            <button type="button" className="clear-btn" onClick={onClear}>
              Clear
            </button>
          </>
        )}
      </div>

      {geoError && <p className="geo-error">{geoError}</p>}

      {userPos && nearest && (
        <div className="nearest-result">
          <span className="nearest-label">Nearest arcade</span>
          <strong>{nearest.arcade.name}</strong>
          <span className="nearest-dist">{formatDistance(nearest.distance)}</span>
          <span className="nearest-meta">{nearest.arcade.mrt.split("\n")[0]}</span>
        </div>
      )}

      {userPos && (
        <div className="radius-controls">
          <span className="radius-label">Within:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.meters}
              type="button"
              className={`radius-btn ${radius === r.meters ? "active" : ""}`}
              onClick={() => onRadiusChange(radius === r.meters ? null : r.meters)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
