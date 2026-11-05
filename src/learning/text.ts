// Pure text helpers for the lesson builder. No DOM or browser APIs, so the
// summarizer and card builder stay testable in Node.

export const MAX_SENTENCES = 400;

const WORDS_PER_MINUTE = 200;
const MIN_TOKEN_LENGTH = 3;

// A boundary is terminal punctuation, optional closing quotes or brackets,
// whitespace, then a capital, digit, or opening quote. Lookahead only: regex
// lookbehind fails to parse on Safari before 16.4.
const SENTENCE_BOUNDARY = /[.!?]+["'”’)\]]*\s+(?=["'“‘([]?[A-Z0-9])/g;

const ABBREVIATIONS: ReadonlySet<string> = new Set([
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'st.', 'mt.', 'vs.',
  'etc.', 'e.g.', 'i.e.', 'inc.', 'ltd.', 'co.', 'corp.', 'no.', 'u.s.', 'u.k.',
]);

const STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'and', 'any',
  'are', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'can',
  'could', 'did', 'does', 'doing', 'down', 'during', 'each', 'even', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'into', 'its', 'itself', 'just', 'like', 'made',
  'make', 'many', 'more', 'most', 'much', 'must', 'myself', 'new', 'nor', 'not',
  'now', 'off', 'once', 'one', 'only', 'other', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'said', 'same', 'says', 'she', 'should', 'since', 'some', 'still',
  'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'too', 'two', 'under', 'until', 'upon',
  'very', 'was', 'way', 'well', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'will', 'with', 'would', 'year', 'years', 'yet', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'according', 'across', 'already', 'among', 'another', 'around',
]);

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  const clean = normalizeWhitespace(text);
  return clean === '' ? 0 : clean.split(' ').length;
}

export function readMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function splitSentences(text: string): string[] {
  const clean = normalizeWhitespace(text);
  const sentences: string[] = [];
  let start = 0;
  for (const match of clean.matchAll(SENTENCE_BOUNDARY)) {
    if (sentences.length >= MAX_SENTENCES) return sentences;
    const end = (match.index ?? 0) + match[0].length;
    const candidate = clean.slice(start, end).trim();
    if (endsWithAbbreviation(candidate)) continue;
    sentences.push(candidate);
    start = end;
  }
  const rest = clean.slice(start).trim();
  if (rest !== '' && sentences.length < MAX_SENTENCES) sentences.push(rest);
  return sentences;
}

export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  return words
    .map((word) => word.replace(/'/g, ''))
    .filter((word) => word.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(word));
}

function endsWithAbbreviation(candidate: string): boolean {
  const lastWord = candidate.slice(candidate.lastIndexOf(' ') + 1);
  // A single capital initial such as the "J." in "J. Smith".
  return ABBREVIATIONS.has(lastWord.toLowerCase()) || /^[A-Z]\.$/.test(lastWord);
}
