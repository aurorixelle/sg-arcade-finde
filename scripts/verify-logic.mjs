// Sanity checks for filter + distance logic against the generated data.
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("./src/data/arcades.json", "utf8"));

const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
const dist = (a, b) =>
  2 * R * Math.asin(
    Math.sqrt(
      Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2
    )
  );

// 1. Region filter: East
console.log("East region:", data.filter((a) => a.region === "East").map((a) => a.branch));

// 2. Chain + game combo: Timezone with PIU
console.log("Timezone + PIU:", data.filter((a) => a.chain === "Timezone" && a.games.piu > 0).map((a) => a.branch));

// 3. Multi-game: maimai + chunithm + taiko
console.log("maimai+chunithm+taiko:", data.filter((a) => a.games.maimai > 0 && a.games.chunithm > 0 && a.games.taiko > 0).map((a) => a.name));

// 4. Radius search: 2km around Bugis+ (both Bugis arcades should be ~0m)
const bugis = { lat: 1.2996, lng: 103.8542 };
const within2k = data
  .map((a) => ({ n: a.branch, d: dist(bugis, a) }))
  .filter((x) => x.d <= 2000)
  .sort((x, y) => x.d - y.d);
console.log("Within 2km of Bugis+:", within2k.map((x) => `${x.n} ${(x.d / 1000).toFixed(2)}km`));

// 5. Data integrity: every arcade has coords, region, planningArea, games
const bad = data.filter((a) => !a.lat || !a.lng || !a.region || !a.planningArea || !a.games);
console.log("Incomplete records:", bad.length === 0 ? "none ✓" : bad.map((a) => a.name));
console.log("Total:", data.length);
