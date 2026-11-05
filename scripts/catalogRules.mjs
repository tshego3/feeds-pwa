// Pure rules for the learning-feed book catalog. Used by
// build-learning-catalog.mjs at build time; no Node or network APIs here, so
// the rules stay testable. Rules mirror plan Section 6.1 and were measured
// against the 2026-11-01 Gutenberg catalog.

/** @typedef {'philosophy'|'psychology'|'success'|'leadership'|'money'|'science'|'health'|'society'} InterestId */
/**
 * @typedef {object} CatalogRecord
 * @property {number} id
 * @property {string} type
 * @property {string} title
 * @property {string} language
 * @property {string} authors
 * @property {readonly string[]} subjects
 * @property {readonly string[]} locc
 * @property {readonly string[]} shelves
 */
/**
 * @typedef {object} BookRef
 * @property {number} gutenbergId
 * @property {string} title
 * @property {string} author
 * @property {InterestId} interest
 * @property {number} sitelinks
 */

export const EXPECTED_HEADER = Object.freeze([
  'Text#', 'Type', 'Issued', 'Title', 'Language', 'Authors', 'Subjects', 'LoCC', 'Bookshelves',
]);

const REJECT_LOCC = /^(P|HA|Z)/;
const REJECT_SUBJECT = /Fiction|Drama|Poetry|Juvenile/i;
const RELIGION_LOCC = /^B[L-X]/;
const MAX_TITLE = 120;

/**
 * Parses RFC 4180 CSV: quoted fields, doubled quotes, newlines in quotes.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  return rows;
}

/**
 * @param {readonly string[][]} rows
 * @returns {CatalogRecord[]}
 */
export function toRecords(rows) {
  const [header, ...body] = rows;
  if (!header || header.join(',') !== EXPECTED_HEADER.join(',')) {
    throw new Error(`Unexpected catalog header: ${header ? header.join(',') : '(empty)'}`);
  }
  return body
    .filter((cells) => cells.length === EXPECTED_HEADER.length)
    .map((cells) => ({
      id: Number(cells[0]),
      type: cells[1] ?? '',
      title: cells[3] ?? '',
      language: cells[4] ?? '',
      authors: cells[5] ?? '',
      subjects: splitList(cells[6]),
      locc: splitList(cells[7]),
      shelves: splitList(cells[8]),
    }))
    .filter((record) => Number.isInteger(record.id) && record.id > 0);
}

/** @param {string | undefined} value */
function splitList(value) {
  return (value ?? '').split(';').map((part) => part.trim()).filter((part) => part !== '');
}

/** @param {CatalogRecord} r */
export function passesBase(r) {
  return (
    r.type === 'Text' &&
    r.language === 'en' &&
    !r.locc.some((c) => REJECT_LOCC.test(c)) &&
    !r.subjects.some((s) => REJECT_SUBJECT.test(s))
  );
}

/** @param {CatalogRecord} r @param {...string} names */
const hasCategory = (r, ...names) => names.some((n) => r.shelves.includes(`Category: ${n}`));
/** @param {CatalogRecord} r @param {RegExp} pattern */
const hasLocc = (r, pattern) => r.locc.some((c) => pattern.test(c));
/** @param {CatalogRecord} r @param {RegExp} pattern */
const hasSubject = (r, pattern) => r.subjects.some((s) => pattern.test(s));

/** @type {Readonly<Record<InterestId, (r: CatalogRecord) => boolean>>} */
export const INTEREST_RULES = Object.freeze({
  philosophy: (r) =>
    hasCategory(r, 'Philosophy & Ethics') && hasLocc(r, /^B/) && !r.locc.some((c) => RELIGION_LOCC.test(c)),
  psychology: (r) => hasCategory(r, 'Psychiatry/Psychology') || hasLocc(r, /^BF/),
  success: (r) => hasSubject(r, /\bSuccess\b|Conduct of life|Self-culture|Self-actualization|Self-help/i),
  leadership: (r) =>
    hasCategory(r, 'Biographies') &&
    hasSubject(r, /Statesmen|Presidents|Generals|Kings and rulers|Businessmen|Inventors|Leadership/i),
  money: (r) => hasLocc(r, /^(HB|HF|HG)/) || hasSubject(r, /\bWealth\b|Finance|Economics|Success in business/i),
  science: (r) => hasLocc(r, /^Q/) && r.shelves.some((s) => s.startsWith('Category: Science')),
  health: (r) => hasCategory(r, 'Health & Medicine') && hasLocc(r, /^(R|QP)/),
  society: (r) => hasCategory(r, 'Politics', 'Sociology') && hasLocc(r, /^(J|H)/),
});

/**
 * Most sitelinks first, then the oldest Gutenberg id.
 * @param {readonly CatalogRecord[]} records
 * @param {ReadonlyMap<number, number>} sitelinks
 * @param {number} limit
 */
export function rankBooks(records, sitelinks, limit) {
  const sorted = [...records].sort(
    (a, b) => (sitelinks.get(b.id) ?? 0) - (sitelinks.get(a.id) ?? 0) || a.id - b.id,
  );
  // Gutenberg often holds several editions of one work; keep the best-ranked.
  const seen = new Set();
  /** @type {CatalogRecord[]} */
  const picked = [];
  for (const record of sorted) {
    if (picked.length >= limit) break;
    const key = `${normalizeTitle(record.title).toLowerCase()}|${firstAuthor(record.authors)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(record);
  }
  return picked;
}

/** @param {string} title */
export function normalizeTitle(title) {
  const clean = title.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_TITLE ? `${clean.slice(0, MAX_TITLE - 1).trimEnd()}…` : clean;
}

/**
 * First author, without life dates or role suffixes such as "[Editor]".
 * @param {string} authors
 */
export function firstAuthor(authors) {
  const first = (authors.split(';')[0] ?? '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/,\s*(?:active\s+)?[\d?]{1,4}\s*(?:BCE?|CE|AD)?\s*-\s*[\d?]{0,4}\s*(?:BCE?|CE|AD)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (first === '') return 'Unknown';
  // "Kant, Immanuel" reads as "Immanuel Kant". Titles such as
  // "Marcus Aurelius, Emperor of Rome" keep their order.
  const parts = first.split(',').map((p) => p.trim()).filter((p) => p !== '');
  const [last, given] = parts;
  if (parts.length === 2 && last && given && !/\bof\b/i.test(given) && given.split(' ').length <= 3) {
    return `${given} ${last}`;
  }
  return parts[0] ?? first;
}

/**
 * @param {CatalogRecord} record
 * @param {InterestId} interest
 * @param {ReadonlyMap<number, number>} sitelinks
 * @returns {BookRef}
 */
export function toBookRef(record, interest, sitelinks) {
  return {
    gutenbergId: record.id,
    title: normalizeTitle(record.title),
    author: firstAuthor(record.authors),
    interest,
    sitelinks: sitelinks.get(record.id) ?? 0,
  };
}

/**
 * Parses the Wikidata CSV (columns pg, links) into id -> highest count.
 * @param {string} csv
 * @returns {Map<number, number>}
 */
export function parseSitelinks(csv) {
  /** @type {Map<number, number>} */
  const map = new Map();
  for (const [pg, links] of parseCsv(csv).slice(1)) {
    const id = Number(pg);
    const count = Number(links);
    if (Number.isInteger(id) && Number.isFinite(count)) map.set(id, Math.max(map.get(id) ?? 0, count));
  }
  return map;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const REFRESH_AFTER_MS = 7 * DAY_MS;
// A fresh catalog with fewer books than this in any interest is treated as
// a bad download (format change, partial data) and is not written.
export const MIN_BOOKS_PER_INTEREST = 10;

/**
 * True when there is no usable generatedAt or it is older than maxAgeMs.
 * @param {unknown} generatedAt
 * @param {number} now
 * @param {number} [maxAgeMs]
 */
export function isStale(generatedAt, now, maxAgeMs = REFRESH_AFTER_MS) {
  if (typeof generatedAt !== 'string') return true;
  const time = Date.parse(generatedAt);
  return Number.isNaN(time) || now - time >= maxAgeMs;
}

/**
 * Problems that make a freshly built catalog unsafe to ship; empty when fine.
 * @param {Readonly<Record<string, readonly unknown[]>>} interests
 * @param {number} [minBooks]
 * @returns {string[]}
 */
export function catalogProblems(interests, minBooks = MIN_BOOKS_PER_INTEREST) {
  const expected = Object.keys(INTEREST_RULES);
  return expected
    .map((id) => [id, interests[id]?.length ?? 0])
    .filter(([, count]) => Number(count) < minBooks)
    .map(([id, count]) => `${id} has ${count} books (minimum ${minBooks})`);
}

/**
 * Sitelink counts saved in a previous books.json, for ranking when Wikidata
 * is unreachable.
 * @param {unknown} previous
 * @returns {Map<number, number>}
 */
export function sitelinksFromCatalog(previous) {
  /** @type {Map<number, number>} */
  const map = new Map();
  const lists = typeof previous === 'object' && previous !== null ? /** @type {{ interests?: unknown }} */ (previous).interests : null;
  if (typeof lists !== 'object' || lists === null) return map;
  for (const list of Object.values(lists)) {
    if (!Array.isArray(list)) continue;
    for (const book of list) {
      const { gutenbergId, sitelinks } = /** @type {{ gutenbergId?: unknown, sitelinks?: unknown }} */ (book ?? {});
      if (typeof gutenbergId === 'number' && typeof sitelinks === 'number') map.set(gutenbergId, sitelinks);
    }
  }
  return map;
}

/** A valid catalog with no books: the app then simply shows no book cards. */
export function emptyCatalog() {
  return {
    generatedAt: '',
    catalogDate: '',
    interests: Object.fromEntries(Object.keys(INTEREST_RULES).map((id) => [id, []])),
  };
}
