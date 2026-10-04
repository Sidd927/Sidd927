import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchCalendar, demoCalendar } from "./contributions.mjs";
import { buildSvg } from "./svg.mjs";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, def) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const out = val("--out", "dist");
const demo = has("--demo");
const username = val("--user", process.env.GH_USERNAME || "Sidd927");
const token = process.env.GITHUB_TOKEN;

const grid = demo
  ? demoCalendar()
  : await fetchCalendar({ username, token });

mkdirSync(out, { recursive: true });
const svg = buildSvg(grid);
const outFile = join(out, "pacman.svg");
writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${(svg.length / 1024).toFixed(1)} KB)`);

// Also save to assets/pacman.svg for local availability/fallback
try {
  mkdirSync("assets", { recursive: true });
  writeFileSync("assets/pacman.svg", svg);
  console.log(`Synced assets/pacman.svg`);
} catch (e) {
  // Ignore if assets directory is not accessible
}
