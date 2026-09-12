// One-time (re-run occasionally) script: geocode every city in the Directory
// Lookup API and cache the result as a static JSON file bundled with the app,
// so the Map page never needs to call Nominatim at runtime.
//
// Usage: node scripts/geocode-cities.mjs
//
// Resumable: re-running skips cities already present in the output file.

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'cityCoords.json');
const API_URL = 'https://api.movesure.io';
const NOMINATIM_UA = 'ss-transport-website/1.0 (contact@ssmovesecure.com)';

function loadExisting() {
  if (!existsSync(OUT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(cache) {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2));
}

async function geocode(cityName, stateName) {
  const q = `${cityName}, ${stateName}, India`;
  const params = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'in' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': NOMINATIM_UA },
  });
  const rows = await res.json();
  if (!rows?.length) return null;
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
}

async function main() {
  const res = await fetch(`${API_URL}/api/directory/lookup?limit=1000`);
  const json = await res.json();
  const cities = json.data?.cities || [];
  console.log(`Fetched ${cities.length} cities from API.`);

  const cache = loadExisting();
  let done = 0;
  let skipped = 0;
  let found = 0;
  let notFound = 0;

  for (const city of cities) {
    const key = `${city.city_name}|${city.state_name}`;
    if (cache[key] !== undefined) {
      skipped++;
      continue;
    }
    const coords = await geocode(city.city_name, city.state_name).catch(() => null);
    cache[key] = coords;
    if (coords) found++; else notFound++;
    done++;
    if (done % 10 === 0) {
      save(cache);
      console.log(`progress: ${done + skipped}/${cities.length} (found ${found}, not found ${notFound}, skipped ${skipped})`);
    }
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim fair-use: 1 req/sec
  }

  save(cache);
  console.log(`Done. found=${found} notFound=${notFound} skipped=${skipped} total=${cities.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
