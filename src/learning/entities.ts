// Decodes the HTML entities that APIs embed in plain-text fields (og:image
// URLs, Open Trivia DB questions). The result is still plain text: render it
// as a React text node, never as HTML.

const NAMED: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  eacute: 'é',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  ntilde: 'ñ',
  shy: '',
};

const MAX_CODE_POINT = 0x10ffff;

export function decodeHtmlEntities(text: string): string {
  // &amp; goes last, so "&amp;quot;" decodes to the literal "&quot;".
  return text
    .replace(/&#x([0-9a-f]{1,6});/gi, (match, hex: string) => fromCodePoint(parseInt(hex, 16), match))
    .replace(/&#(\d{1,7});/g, (match, dec: string) => fromCodePoint(parseInt(dec, 10), match))
    // Entity names are case-sensitive: &Eacute; is É, so only exact names match.
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED[name] ?? match)
    .replace(/&amp;/gi, '&');
}

function fromCodePoint(code: number, fallback: string): string {
  return Number.isInteger(code) && code > 0 && code <= MAX_CODE_POINT ? String.fromCodePoint(code) : fallback;
}
