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
- **Machine status**: per-cab condition for maimai / CHUNITHM (mirrors the sheet's
  status tabs — each cab and side has a status, note and last-reported date),
  shown as chips on the arcade cards and in a dedicated **Machine status** view.
  Admins edit it from the admin panel's **Status** action.
- **Prices**: free-text price per arcade × per game (e.g. "14 tokens / 4 medals"),
  editable by admins in the arcade form, shown on cards and in the status view.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Accounts & live data (Firebase, free tier)

Email+password accounts (with verification email), per-user favorites, and an
admin panel that edits arcade data live in Firestore. Until Firebase is
configured the site runs in account-less snapshot mode with the bundled JSON.

One-time setup (all free, no card needed):

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com/)
2. **Authentication → Sign-in method → enable Email/Password**
3. **Firestore Database → Create database** (production mode), then paste the
   contents of [`firestore.rules`](firestore.rules) into **Rules → Publish**
4. **Project settings → Your apps → Web app** → copy the `firebaseConfig`
   object into `src/firebase-config.js`
5. **Project settings → Service accounts → Generate new private key** and save
   it as `scripts/service-account.json` (git-ignored — never commit it)
6. Seed the data and grant yourself admin:

```bash
node scripts/seed-firestore.mjs --import
node scripts/seed-firestore.mjs --make-admin your@email.com
```

Then register in the app, verify the email, log in, and the Admin tab appears
for the admin account. All visitors see data updates in real time (Firestore
`onSnapshot`); writes are limited to admins by the security rules.

## Managing admin accounts

Prerequisite: `scripts/service-account.json` present (kept forever, never committed).

From the project directory (`C:\Users\Lenovo\Projects\sg-arcade-finder`):

```bash
npm run users                      # list all accounts: email / verified / admin / favorites
npm run admin:grant -- a@b.com     # grant admin to an existing, logged-in-once account
npm run admin:revoke -- a@b.com    # remove admin
```

Equivalent raw commands: `node scripts/seed-firestore.mjs --make-admin a@b.com`
etc. The change takes effect on the user's next page refresh — no redeploy needed.

Manual fallback via Firebase console (no local files needed):
1. **Authentication → Users** — find the account, copy its **UID**
2. **Firestore Database → Data → `users` collection → `{uid}` document**
3. Add/edit boolean field `admin` → `true` (or `false` to revoke) → save

Note: a `users/{uid}` document is created the first time an account logs in,
so grant admin only after the person has logged in once.

`node scripts/test-rules.mjs` — end-to-end rules self-check: creates a throwaway
account, verifies a signed-in user can read their profile and that non-admins
cannot write arcade data, then cleans up.

## Refreshing the data snapshot

When the Google Sheet changes, regenerate `src/data/arcades.json`:

```bash
node scripts/generate-data.mjs
```

The script re-downloads the CSV, re-parses, and reuses cached OneMap geocodes
(`scripts/.geocache.json`). New locations need a manual entry in `AREA_MAP`
inside the script to set their region / planning area. Regeneration preserves
admin-curated `machineStatus` / `prices` fields from the previous file.

To push a regenerated snapshot into Firestore:

```bash
node scripts/seed-firestore.mjs --import
```

⚠️ `--import` merges over the Firestore docs — sheet-sourced fields in the JSON
replace live values, but fields absent from the JSON (e.g. statuses edited in
the admin panel on a stale local file) are left alone.

## Machine status import (one-time baseline)

`scripts/import-status.mjs` imported the sheet's maimai / CHUNITHM status tabs
(per-cab status, notes, report dates) into the arcade docs' `machineStatus`
field, plus seeded `prices.maimai` from the sheet's `(*)` footnote
(10 tokens / 3 medals, or 14 / 4 where pricing is higher). It can be re-run if
needed — always a merge, never touches other fields:

```bash
npm run status:import            # dry run: parse + report only
npm run status:import -- --write # also merge into Firestore + arcades.json
```

Sheet locations are matched to arcade docs by chain + branch; the mapping
exceptions live in `LOCATION_OVERRIDES` inside the script. Unmatched locations
are skipped with a warning (e.g. Timezone Plaza Singapura — closed Aug 2026).
After this baseline, statuses are maintained through the admin panel.

When a game version changes everywhere (e.g. maimai 1.65-A → 1.65-B):

```bash
node scripts/set-version.mjs maimai 1.65-B --write   # dry run without --write
```

It reads targets from Firestore (so admin-added arcades are included) and
merge-writes only the `version` field, then syncs `arcades.json`.

## Notes

- Geolocation requires HTTPS or `localhost`.
- `*` on the sheet means higher maimai pricing (14 tokens / 4 medals); `^` means the
  cabinets accept 100 yen-medals. Pricing now lives in the editable `prices`
  field per arcade; the `higherPricing` footnote only shows as a fallback when
  no maimai price is set.
- The Firebase web `apiKey` in `src/firebase-config.js` is a public identifier,
  not a secret — access is controlled by Auth + Firestore rules.
