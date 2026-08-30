import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { CHAIN_COLORS } from "../constants.js";

// Colored dot marker per chain (avoids Leaflet's default icon asset path issues)
function makeIcon(chain, selected) {
  const color = CHAIN_COLORS[chain] || "#64748b";
  return L.divIcon({
    className: "arcade-marker",
    html: `<span style="background:${color};border-color:${selected ? "#111" : "#fff"};box-shadow:${selected ? "0 0 0 3px rgba(17,17,17,.25)" : "none"}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

// Pans/zooms the map when the focus target changes (selected arcade or user position)
function Recenter({ target, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom ?? Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [target?.lat, target?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapView({
  arcades,
  userPos,
  radius,
  selected,
  onSelect,
  focusTarget,
}) {
  const center = useMemo(() => userPos ?? { lat: 1.3521, lng: 103.8198 }, [userPos]);

  // Arcades sharing a building (same postal) get a small offset so markers don't fully overlap
  const positioned = useMemo(() => {
    const seen = new Map();
    return arcades.map((a) => {
      const key = `${a.lat},${a.lng}`;
      const i = seen.get(key) ?? 0;
      seen.set(key, i + 1);
      return { ...a, posLat: a.lat + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.00022, posLng: a.lng };
    });
  }, [arcades]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={userPos ? 13 : 11}
      className="map"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter target={focusTarget} />

      {userPos && radius && (
        <Circle
          center={[userPos.lat, userPos.lng]}
          radius={radius}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.06, weight: 1.5 }}
        />
      )}
      {userPos && (
        <Circle
          center={[userPos.lat, userPos.lng]}
          radius={20}
          pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.9, weight: 1 }}
        />
      )}

      {positioned.map((a) => (
        <Marker
          key={a.id ?? a.name}
          position={[a.posLat, a.posLng]}
          icon={makeIcon(a.chain, selected === a.name)}
          eventHandlers={{ click: () => onSelect(a.name) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{a.branch}</strong>
              <span>{a.chain}</span>
              <span>{a.address}, S({a.postal})</span>
              <span>
                maimai ×{a.games.maimai} · CHUNITHM ×{a.games.chunithm}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
