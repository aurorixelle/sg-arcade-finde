# SG Arcade Finder

Find rhythm game arcades in Singapore (maimai, CHUNITHM, Taiko, IIDX, SDVX, DDR, jubeat,
GITADORA, pop'n music, DanceRush, Pump It Up).

Data is a snapshot of the
[maimai & CHUNITHM Singapore Public Sheet](https://docs.google.com/spreadsheets/d/1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc/htmlview#gid=306092234)
(31 locations across Virtualand / Paco FunWorld / Timezone / Cow Play Cow Moo / Zone X),
geocoded via [OneMap](https://www.onemap.gov.sg) and tagged with Singapore region +
planning area.

## Features

- **Filter** by region → planning area, arcade chain, and any combination of games
- **Nearest arcade**: use your browser location to find the closest arcade
- **Radius search**: show arcades within 1 / 2 / 5 km of you (map circle + sorted list)
- **Map** (Leaflet + OpenStreetMap) with per-chain colored markers, linked to the list

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Refreshing the data snapshot

When the Google Sheet changes, regenerate `src/data/arcades.json`:

```bash
node scripts/generate-data.mjs
```

The script re-downloads the CSV, re-parses, and reuses cached OneMap geocodes
(`scripts/.geocache.json`). New locations need a manual entry in `AREA_MAP`
inside the script to set their region / planning area.

## Notes

- Geolocation requires HTTPS or `localhost`.
- `*` on the sheet means higher maimai pricing (14 tokens / 4 medals); `^` means the
  cabinets accept 100 yen-medals — both are surfaced on the arcade cards.
