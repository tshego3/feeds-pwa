import { countWords, normalizeWhitespace, splitSentences } from './text';

// Pure helpers that turn a Gutenberg plain-text book into chunks of
// paragraphs. No DOM or browser APIs: this runs inside the book Web Worker.

const START_MARKER = /^\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;
const END_MARKER = /^\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;
const NUMBERED_HEADING = /^\s*(?:CHAPTER|BOOK|PART|SECTION|LETTER)\s+[IVXLC\d]+\b/i;
const MAX_HEADING_CHARS = 60;
const MAX_HEADING_WORDS = 8;
const MIN_CHAPTER_WORDS = 300;
const MIN_CHAPTERS = 4;
const FALLBACK_CHUNK_WORDS = 3_000;
const MAX_CHUNKS = 24;
const MIN_PARAGRAPH_CHARS = 40;
// Prose is mostly letters and spaces. Tables, ASCII diagrams, and rule lines
// ("| | ___", "-----") are not, and make unreadable ideas.
const MIN_LETTER_RATIO = 0.8;
const DIAGRAM_RUN = /[|_=*#~<>\\/-]{3,}|(?:\|\s*){2,}/;
const MINOR_WORDS: ReadonlySet<string> = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'upon', 'with']);
const TITLE_CASE_RATIO = 0.8;
const MAX_LEADING_TITLES = 3;
const LEADING_HEADING = /^(?:CHAPTER|BOOK|PART|SECTION|LETTER)\s+[IVXLC\d]+\b\.?\s*/i;

export function stripGutenbergBoilerplate(text: string): string {
  const start = START_MARKER.exec(text);
  const from = start ? start.index + start[0].length : 0;
  const end = END_MARKER.exec(text.slice(from));
  return text.slice(from, end ? from + end.index : undefined).trim();
}

// Chapters by heading when the book has them; otherwise ~3,000-word chunks.
// Tiny sections (tables of contents, short prefaces) merge into the next.
export function splitChapters(text: string): string[] {
  const chapters = mergeSmall(splitOnHeadings(text));
  const chunks = chapters.length >= MIN_CHAPTERS ? chapters : chunkByWords(text);
  return capChunks(chunks);
}

export function toParagraphs(chunk: string): string[] {
  return chunk
    .split(/\n\s*\n/)
    .map((paragraph) => dropLeadingTitles(normalizeWhitespace(paragraph).replace(LEADING_HEADING, '')))
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_CHARS && !isHeading(paragraph) && isProse(paragraph));
}

// Section titles often sit at the start of a paragraph as their own
// sentence ("Transcendental Deduction of the pure Conceptions."), or stand as a
// paragraph of their own. Drop them.
function dropLeadingTitles(paragraph: string): string {
  const sentences = splitSentences(paragraph);
  let start = 0;
  while (start < Math.min(MAX_LEADING_TITLES, sentences.length) && isTitleCase(sentences[start] ?? '')) start += 1;
  // A paragraph made only of titles becomes empty and is filtered out.
  return start === 0 ? paragraph : sentences.slice(start).join(' ');
}

export function isTitleCase(sentence: string): boolean {
  const words = sentence.replace(/[^\p{L}\s'-]/gu, '').split(/\s+/).filter((w) => w !== '');
  const major = words.filter((w) => !MINOR_WORDS.has(w.toLowerCase()));
  if (words.length < 3 || major.length === 0) return false;
  const capitalized = major.filter((w) => /^\p{Lu}/u.test(w)).length;
  return capitalized / major.length >= TITLE_CASE_RATIO;
}

function isProse(paragraph: string): boolean {
  if (DIAGRAM_RUN.test(paragraph)) return false;
  const letters = paragraph.replace(/[^\p{L}\s]/gu, '').length;
  return letters / paragraph.length >= MIN_LETTER_RATIO;
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.length > MAX_HEADING_CHARS) return false;
  if (NUMBERED_HEADING.test(trimmed)) return true;
  const allCaps = /[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase();
  return allCaps && trimmed.split(/\s+/).length <= MAX_HEADING_WORDS;
}

function splitOnHeadings(text: string): string[] {
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (isHeading(line)) {
      if (current.some((l) => l.trim() !== '')) sections.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.some((l) => l.trim() !== '')) sections.push(current.join('\n'));
  return sections;
}

function mergeSmall(sections: readonly string[]): string[] {
  const merged: string[] = [];
  let pending = '';
  for (const section of sections) {
    pending = pending === '' ? section : `${pending}\n\n${section}`;
    if (countWords(pending) >= MIN_CHAPTER_WORDS) {
      merged.push(pending);
      pending = '';
    }
  }
  if (pending !== '') merged.push(pending);
  return merged;
}

function chunkByWords(text: string): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    current.push(paragraph);
    words += countWords(paragraph);
    if (words >= FALLBACK_CHUNK_WORDS) {
      chunks.push(current.join('\n\n'));
      current = [];
      words = 0;
    }
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

function capChunks(chunks: readonly string[]): string[] {
  if (chunks.length <= MAX_CHUNKS) return [...chunks];
  return [...chunks.slice(0, MAX_CHUNKS - 1), chunks.slice(MAX_CHUNKS - 1).join('\n\n')];
}
