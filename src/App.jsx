import { useEffect, useMemo, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import AuthModal from "./auth/AuthModal.jsx";
import VerifyBanner from "./auth/VerifyBanner.jsx";
import { useArcades } from "./hooks/useArcades.js";
import { useTheme } from "./hooks/useTheme.js";
import FilterBar from "./components/FilterBar.jsx";
import ArcadeCard from "./components/ArcadeCard.jsx";
import MapView from "./components/MapView.jsx";
import NearMePanel from "./components/NearMePanel.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import StatusView from "./components/StatusView.jsx";
import { distanceM } from "./utils/geo.js";
import { CHAIN_COLORS, CHAINS } from "./constants.js";

export default function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}

function Layout() {
  const { user, isAdmin, verified, favorites, firebaseReady, signOut, toggleFavorite } = useAuth();
  const { arcades, source } = useArcades();
  const { theme, toggle: toggleTheme } = useTheme();

  const [view, setView] = useState("browse"); // browse | status | admin
  const [statusFocus, setStatusFocus] = useState(null); // arcade id to scroll to in the status view
  const [showAuth, setShowAuth] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [region, setRegion] = useState("");
  const [planningArea, setPlanningArea] = useState("");
  const [chain, setChain] = useState("");
  const [selectedGames, setSelectedGames] = useState(() => new Set());
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [radius, setRadius] = useState(null);
  const [selected, setSelected] = useState(null);
  const listRef = useRef(null);

  const chains = useMemo(
    () => CHAINS.filter((c) => arcades.some((a) => a.chain === c)),
    [arcades]
  );

  function toggleGame(key) {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetFilters() {
    setRegion("");
    setPlanningArea("");
    setChain("");
    setSelectedGames(new Set());
    setFavoritesOnly(false);
  }

  function onRegionChange(value) {
    setRegion(value);
    setPlanningArea(""); // planning area options change with region
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow location access or continue browsing without it."
            : `Could not get your location (${err.message}).`
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Filter: region + planning area + chain + games + favorites
  const filtered = useMemo(() => {
    return arcades.filter((a) => {
      if (region && a.region !== region) return false;
      if (planningArea && a.planningArea !== planningArea) return false;
      if (chain && a.chain !== chain) return false;
      for (const g of selectedGames) if (!(a.games[g] > 0)) return false;
      if (favoritesOnly && !favorites.includes(a.id)) return false;
      return true;
    });
  }, [arcades, region, planningArea, chain, selectedGames, favoritesOnly, favorites]);

  // Annotate with distance, apply radius search, sort
  const results = useMemo(() => {
    let list = filtered.map((a) =>
      userPos ? { arcade: a, distance: distanceM(userPos, a) } : { arcade: a, distance: null }
    );
    if (userPos) {
      if (radius) list = list.filter((r) => r.distance <= radius);
      list.sort((x, y) => x.distance - y.distance);
    }
    return list;
  }, [filtered, userPos, radius]);

  const nearest = useMemo(() => {
    if (!userPos) return null;
    return arcades
      .map((a) => ({ arcade: a, distance: distanceM(userPos, a) }))
      .sort((x, y) => x.distance - y.distance)[0];
  }, [userPos, arcades]);

  // Scroll selected card into view when picked from the map
  useEffect(() => {
    if (!selected || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-arcade="${CSS.escape(selected)}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const selectedArcade =
    results.find((r) => r.arcade.name === selected)?.arcade ??
    arcades.find((a) => a.name === selected);
  const focusTarget = userPos
    ?? (selectedArcade ? { lat: selectedArcade.lat, lng: selectedArcade.lng } : null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <div className="header-title">
            <h1>SG Arcade Finder</h1>
            <p>
              Rhythm game arcades in Singapore · {arcades.length} locations ·{" "}
              <a
                href="https://docs.google.com/spreadsheets/d/1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc/htmlview#gid=306092234"
                target="_blank"
                rel="noreferrer"
              >
                maimai &amp; CHUNITHM SG public sheet
              </a>
            </p>
          </div>

          <div className="view-tabs">
            <button
              type="button"
              className="view-tab-btn theme-toggle"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              type="button"
              className={`view-tab-btn ${view === "browse" ? "active" : ""}`}
              onClick={() => setView("browse")}
            >
              Browse
            </button>
            <button
              type="button"
              className={`view-tab-btn ${view === "status" ? "active" : ""}`}
              onClick={() => {
                setView("status");
                setStatusFocus(null);
              }}
            >
              Machine status
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`view-tab-btn ${view === "admin" ? "active" : ""}`}
                onClick={() => setView(view === "admin" ? "browse" : "admin")}
              >
                Admin
              </button>
            )}
          </div>

          <div className="auth-zone">
            {!firebaseReady ? (
              <span className="dim-note">Accounts not configured (snapshot mode)</span>
            ) : !user ? (
              <button type="button" className="login-btn" onClick={() => setShowAuth(true)}>
                Sign in / Register
              </button>
            ) : (
              <>
                <span className="user-email" title={verified ? "Verified" : "Email not verified"}>
                  {user.email}
                  {!verified && <em>(unverified)</em>}
                </span>
                {verified && (
                  <button
                    type="button"
                    className={`fav-toggle ${favoritesOnly ? "active" : ""}`}
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    title="Favorites only"
                  >
                    ❤ {favorites.length}
                  </button>
                )}
                <button type="button" className="clear-btn" onClick={signOut}>
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
        <VerifyBanner />
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {view === "admin" && isAdmin ? (
        <AdminPanel arcades={arcades} onExit={() => setView("browse")} />
      ) : view === "status" ? (
        <StatusView arcades={arcades} focus={statusFocus} onExit={() => setView("browse")} />
      ) : (
        <>
          <FilterBar
            arcades={arcades}
            region={region}
            planningArea={planningArea}
            chain={chain}
            chains={chains}
            selectedGames={selectedGames}
            onRegionChange={onRegionChange}
            onPlanningAreaChange={setPlanningArea}
            onChainChange={setChain}
            onToggleGame={toggleGame}
            onReset={resetFilters}
          />

          <NearMePanel
            userPos={userPos}
            locating={locating}
            geoError={geoError}
            nearest={nearest}
            radius={radius}
            onLocate={locate}
            onRadiusChange={setRadius}
            onClear={() => {
              setUserPos(null);
              setRadius(null);
              setGeoError(null);
            }}
          />

          <main className="app-main">
            <section className="arcade-list" ref={listRef}>
              <div className="result-count">
                {results.length} arcade{results.length === 1 ? "" : "s"}
                {radius && userPos ? ` within ${radius / 1000} km` : ""}
                {(region || planningArea || chain || selectedGames.size > 0 || favoritesOnly) && " (filtered)"}
                {source === "firestore" && <span className="live-dot" title="Live data from Firestore">● live</span>}
              </div>
              {results.length === 0 && (
                <p className="empty-state">
                  No arcades match the current filters. Try widening your search.
                </p>
              )}
              {results.map(({ arcade, distance }) => (
                <ArcadeCard
                  key={arcade.id ?? arcade.name}
                  arcade={arcade}
                  distance={distance}
                  selected={selected === arcade.name}
                  onSelect={() => setSelected(arcade.name)}
                  isFavorite={favorites.includes(arcade.id)}
                  onToggleFavorite={verified ? () => toggleFavorite(arcade.id) : null}
                  onOpenStatus={() => {
                    setStatusFocus(arcade.id);
                    setView("status");
                  }}
                />
              ))}
            </section>

            <section className="map-pane">
              <MapView
                arcades={results.map((r) => r.arcade)}
                userPos={userPos}
                radius={radius}
                selected={selected}
                onSelect={setSelected}
                focusTarget={focusTarget}
              />
              <div className="map-legend">
                {chains.map((c) => (
                  <span key={c}>
                    <i style={{ background: CHAIN_COLORS[c] }} />
                    {c}
                  </span>
                ))}
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}
