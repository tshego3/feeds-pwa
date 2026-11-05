// Builds public/learning/books.json from Gutenberg's offline catalog and
// Wikidata (CC0 notability, so famous books come first).
//
// Two modes:
//   npm run catalog       Force a refresh. Exits 1 on failure (old file kept).
//   --auto (prebuild)     Runs before every `npm run build`. Refreshes only
//                         when books.json is older than 7 days, and never
//                         fails the build: any problem is a warning.
// Set SKIP_CATALOG=1 to skip the automatic refresh (offline builds, CI).
//
// Fallbacks, in order:
//   - Wikidata down: rank with the sitelink counts saved in the current file.
//   - Gutenberg down, bad data, or too few books: keep the current file.
//   - No file at all: write an empty catalog; the app shows no book cards.
// The file is replaced atomically (temp file + rename), never half-written.
//
// Why build time: Gutenberg's website is for human users only. The offline
// catalog is its sanctioned machine-readable source and refreshes weekly.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INTEREST_RULES, catalogProblems, emptyCatalog, isStale, parseCsv, parseSitelinks, passesBase,
  rankBooks, sitelinksFromCatalog, toBookRef, toRecords,
} from './catalogRules.mjs';

const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';
const SPARQL = 'SELECT ?pg ?links WHERE { ?item wdt:P2034 ?pg ; wikibase:sitelinks ?links . FILTER(?links >= 3) }';
const USER_AGENT = 'feeds-pwa catalog builder (https://tshego3.github.io/feeds-pwa/)';
const TIMEOUT_MS = 90_000;
const BOOKS_PER_INTEREST = 60;
const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(SCRIPTS_DIR, '../public/learning/books.json');
// Outside public/ so an interrupted write can never ship with the site; same
// filesystem as OUT_FILE so the rename is atomic.
const TEMP_FILE = resolve(SCRIPTS_DIR, '.books.json.tmp');

const AUTO = process.argv.includes('--auto');
const log = (message) => console.log(`[catalog] ${message}`);

/** @param {string} url @param {RequestInit} [init] */
async function fetchOk(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return res;
}

async function readExisting() {
  try {
    return /** @type {unknown} */ (JSON.parse(await readFile(OUT_FILE, 'utf8')));
  } catch {
    return null;
  }
}

async function loadCatalog() {
  const res = await fetchOk(CATALOG_URL);
  const lastModified = res.headers.get('last-modified');
  const csv = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
  const catalogDate = lastModified ? new Date(lastModified).toISOString().slice(0, 10) : 'unknown';
  return { records: toRecords(parseCsv(csv)), catalogDate };
}

/** @param {unknown} existing */
async function loadSitelinks(existing) {
  try {
    const res = await fetchOk(WIKIDATA_URL, {
      method: 'POST',
      body: new URLSearchParams({ query: SPARQL }),
      headers: { Accept: 'text/csv', 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const sitelinks = parseSitelinks(await res.text());
    if (sitelinks.size > 0) return sitelinks;
    throw new Error('Wikidata returned no rows');
  } catch (err) {
    const saved = sitelinksFromCatalog(existing);
    log(`Wikidata unavailable (${message(err)}); ${saved.size > 0 ? 'reusing rankings from the current books.json' : 'ranking without notability'}.`);
    return saved;
  }
}

/** @param {object} catalog */
async function writeAtomically(catalog) {
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(TEMP_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(TEMP_FILE, OUT_FILE);
}

/** @param {unknown} existing */
async function refresh(existing) {
  const [{ records, catalogDate }, sitelinks] = await Promise.all([loadCatalog(), loadSitelinks(existing)]);
  const base = records.filter(passesBase);
  /** @type {Record<string, unknown[]>} */
  const interests = {};
  for (const [interest, rule] of Object.entries(INTEREST_RULES)) {
    const ranked = rankBooks(base.filter(rule), sitelinks, BOOKS_PER_INTEREST);
    interests[interest] = ranked.map((r) => toBookRef(r, /** @type {never} */ (interest), sitelinks));
  }
  const problems = catalogProblems(interests);
  if (problems.length > 0) throw new Error(`new catalog looks wrong: ${problems.join('; ')}`);
  await writeAtomically({ generatedAt: new Date().toISOString(), catalogDate, interests });
  log(`books.json updated (catalog ${catalogDate}): ${Object.entries(interests).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
}

/** @param {unknown} err */
function message(err) {
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  const existing = await readExisting();
  if (AUTO && process.env.SKIP_CATALOG === '1') {
    log('SKIP_CATALOG=1; keeping the current books.json.');
  } else if (AUTO && !isStale(/** @type {{ generatedAt?: unknown } | null} */ (existing)?.generatedAt, Date.now())) {
    log('books.json is less than 7 days old; no refresh needed.');
    return;
  } else {
    try {
      await refresh(existing);
      return;
    } catch (err) {
      if (!AUTO) throw err;
      log(`Refresh failed (${message(err)}); keeping the current books.json.`);
    }
  }
  if (existing === null) {
    await writeAtomically(emptyCatalog());
    log('No books.json existed; wrote an empty catalog so the build can continue.');
  }
}

main().catch((err) => {
  console.error(`[catalog] Refresh failed: ${message(err)}. The current books.json was kept.`);
  process.exit(AUTO ? 0 : 1);
});
