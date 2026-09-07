// Game keys match the `games` object in src/data/arcades.json
export const GAMES = [
  { key: "maimai", label: "maimai" },
  { key: "chunithm", label: "CHUNITHM" },
  { key: "taiko", label: "Taiko" },
  { key: "iidx", label: "IIDX" },
  { key: "sdvx", label: "SDVX" },
  { key: "ddr", label: "DDR" },
  { key: "jubeat", label: "jubeat" },
  { key: "gitadora", label: "GITADORA" },
  { key: "popn", label: "pop'n music" },
  { key: "drs", label: "DanceRush" },
  { key: "piu", label: "Pump It Up" },
];

export const CHAINS = ["Virtualand", "Paco FunWorld", "Timezone", "Cow Play Cow Moo", "Zone X"];

// Community source spreadsheet (linked from the header and the mobile More sheet)
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yR7zAoR0DErE5iigS-VMBo4Cm5vlHP46gQsjW-t0MYc/htmlview";

export const CHAIN_COLORS = {
  Virtualand: "#e05353",
  "Paco FunWorld": "#e58f2a",
  Timezone: "#3b82f6",
  "Cow Play Cow Moo": "#22a06b",
  "Zone X": "#8b5cf6",
};

export const REGIONS = ["Central", "East", "North", "North-East", "West"];

// Games that carry per-cab machine status (the community sheet only tracks these two)
export const STATUS_GAMES = ["maimai", "chunithm"];

// Cab status values, mirroring the sheet's legend. Keys are the stored values.
export const STATUS = [
  { key: "ok", emoji: "✅", short: "OK", label: "No known or reported problems" },
  { key: "minor", emoji: "⚠️", short: "Minor issues", label: "Playable with minor issues" },
  { key: "down", emoji: "❌", short: "Down", label: "Unplayable in normal circumstances, major issues" },
  { key: "guest", emoji: "⬇️", short: "Guest only", label: "Only guest play available" },
  { key: "off", emoji: "⚫", short: "Powered off", label: "Powered off" },
  { key: "unknown", emoji: "❓", short: "Needs more info", label: "Needs more info" },
];
export const STATUS_BY_KEY = Object.fromEntries(STATUS.map((s) => [s.key, s]));

export const RADIUS_OPTIONS = [
  { label: "1 km", meters: 1000 },
  { label: "2 km", meters: 2000 },
  { label: "5 km", meters: 5000 },
];
