import { describe, it, expect } from 'vitest';
import {
  EXPECTED_HEADER, INTEREST_RULES, catalogProblems, emptyCatalog, firstAuthor, isStale, normalizeTitle,
  parseCsv, passesBase, rankBooks, sitelinksFromCatalog, toRecords,
} from './catalogRules.mjs';

// Fixture rows copied from the 2026-11-01 Gutenberg offline catalog.
const HEADER = EXPECTED_HEADER.join(',');
const ROW_1 = '1,Text,1971-12-01,The Declaration of Independence of the United States of America,en,"Jefferson, Thomas, 1743-1826","United States -- History -- Revolution, 1775-1783 -- Sources; United States. Declaration of Independence",E201; JK,"Politics; Category: Essays, Letters & Speeches; Category: Politics"';
const ROW_161 = '161,Text,1994-12-01,Sense and Sensibility,en,"Austen, Jane, 1775-1817","Domestic fiction; England -- Fiction; Love stories",PR,"Category: Novels; Category: Romance"';
const ROW_8581 = '8581,Text,2005-07-01,"The art of money getting : or, golden rules for making money",en,"Barnum, P. T. (Phineas Taylor), 1810-1891","Success; Success in business",HF,"Category: Business/Management"';
const CSV = [HEADER, ROW_1, ROW_161, ROW_8581].join('\n');

describe('parseCsv', () => {
  it('handles quoted commas, doubled quotes, and newlines in quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi""","line\nbreak"\n1,2,3,4')).toEqual([
      ['a', 'b, c', 'say "hi"', 'line\nbreak'],
      ['1', '2', '3', '4'],
    ]);
  });
});

describe('toRecords', () => {
  it('throws when the catalog header changes', () => {
    expect(() => toRecords(parseCsv('Id,Title\n1,x'))).toThrow(/Unexpected catalog header/);
  });

  it('splits list columns on semicolons', () => {
    const [record] = toRecords(parseCsv(CSV));
    expect(record?.locc).toEqual(['E201', 'JK']);
  });
});

describe('interest rules', () => {
  const records = toRecords(parseCsv(CSV));
  const byId = (id) => records.find((r) => r.id === id);

  it('rejects literature and fiction in the base filter', () => {
    expect(passesBase(byId(161))).toBe(false);
  });

  it('keeps The Art of Money Getting for money and the Declaration for society', () => {
    expect(passesBase(byId(8581)) && INTEREST_RULES.money(byId(8581))).toBe(true);
    expect(passesBase(byId(1)) && INTEREST_RULES.society(byId(1))).toBe(true);
  });
});

describe('rankBooks', () => {
  it('orders by sitelinks, then by lower id, and drops duplicate editions', () => {
    const base = { type: 'Text', language: 'en', subjects: [], locc: [], shelves: [] };
    const records = [
      { ...base, id: 30, title: 'B', authors: 'Y' },
      { ...base, id: 20, title: 'A', authors: 'X' },
      { ...base, id: 10, title: 'C', authors: 'Z' },
      { ...base, id: 40, title: 'A', authors: 'X' },
    ];
    const ranked = rankBooks(records, new Map([[30, 9], [40, 12]]), 10);
    expect(ranked.map((r) => r.id)).toEqual([40, 30, 10]);
  });
});

describe('normalizeTitle and firstAuthor', () => {
  it('collapses newlines in titles', () => {
    expect(normalizeTitle('The Kybalion\nA Study')).toBe('The Kybalion A Study');
  });

  it('drops life dates and reorders last, first', () => {
    expect(firstAuthor('Kant, Immanuel, 1724-1804')).toBe('Immanuel Kant');
    expect(firstAuthor('Marcus Aurelius, Emperor of Rome, 121-180')).toBe('Marcus Aurelius');
  });
});

describe('catalog refresh safeguards', () => {
  const NOW = Date.parse('2026-11-08T00:00:00Z');

  it('refreshes a missing, malformed, or week-old catalog only', () => {
    expect(isStale(undefined, NOW)).toBe(true);
    expect(isStale('', NOW)).toBe(true);
    expect(isStale('2026-10-31T00:00:00Z', NOW)).toBe(true);
    expect(isStale('2026-11-05T00:00:00Z', NOW)).toBe(false);
  });

  it('rejects a new catalog with a thin or missing interest', () => {
    const full = Object.fromEntries(Object.keys(INTEREST_RULES).map((id) => [id, Array.from({ length: 12 }, () => ({}))]));
    expect(catalogProblems(full)).toEqual([]);
    expect(catalogProblems({ ...full, money: [{}] })).toEqual(['money has 1 books (minimum 10)']);
  });

  it('reuses sitelink counts from the previous catalog', () => {
    const previous = { interests: { philosophy: [{ gutenbergId: 2680, sitelinks: 51 }, { gutenbergId: 'x' }] } };
    expect([...sitelinksFromCatalog(previous)]).toEqual([[2680, 51]]);
    expect(sitelinksFromCatalog(null).size).toBe(0);
  });

  it('builds an empty catalog with every interest present', () => {
    expect(Object.keys(emptyCatalog().interests).sort()).toEqual(Object.keys(INTEREST_RULES).sort());
  });
});
