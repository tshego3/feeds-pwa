import type { LessonCard } from '../types';
import { ARTICLE_SCORING, scoreSentences, type ScoringOptions } from './summarizer';
import { clamp, countWords, normalizeWhitespace, splitSentences } from './text';

// Splits an article into near-equal sections and turns each section's best
// sentence into one "key idea" card.

export const CARD_MIN = 4;
export const CARD_MAX = 8;
export const WORDS_PER_CARD = 180;
export const CARD_WORD_LIMIT = 60;

const SHORT_CARD_WORDS = 25;

export interface CardOptions {
  readonly cardMin: number;
  readonly cardMax: number;
  readonly wordsPerCard: number;
  readonly wordLimit: number;
  readonly scoring: ScoringOptions;
}

export const ARTICLE_CARDS: CardOptions = {
  cardMin: CARD_MIN,
  cardMax: CARD_MAX,
  wordsPerCard: WORDS_PER_CARD,
  wordLimit: CARD_WORD_LIMIT,
  scoring: ARTICLE_SCORING,
};

export function buildCards(
  paragraphs: readonly string[],
  title: string,
  options: CardOptions = ARTICLE_CARDS,
): LessonCard[] {
  const clean = paragraphs.map(normalizeWhitespace).filter((p) => p !== '');
  if (clean.length === 0) return [];

  const wordCounts = clean.map(countWords);
  const totalWords = wordCounts.reduce((sum, n) => sum + n, 0);
  const cardCount = Math.min(
    clean.length,
    clamp(Math.ceil(totalWords / options.wordsPerCard), options.cardMin, options.cardMax),
  );

  return groupParagraphs(clean, wordCounts, cardCount)
    .map((section) => cardText(section, title, options))
    .filter((text) => text !== '')
    .map((text, index) => ({ index, text }));
}

// Assigns each paragraph to a section by its running word count. The bounds
// keep sections in order, never skip a section, and leave enough paragraphs
// for the sections still to fill, so no section ends up empty.
function groupParagraphs(
  paragraphs: readonly string[],
  wordCounts: readonly number[],
  sectionCount: number,
): string[][] {
  const totalWords = wordCounts.reduce((sum, n) => sum + n, 0);
  const target = Math.max(1, totalWords / sectionCount);
  const sections: string[][] = Array.from({ length: sectionCount }, () => []);
  let wordsBefore = 0;
  let previous = -1;

  paragraphs.forEach((paragraph, i) => {
    const byWords = Math.floor(wordsBefore / target);
    const mustReach = sectionCount - (paragraphs.length - i);
    const index = Math.min(previous + 1, sectionCount - 1, Math.max(byWords, mustReach, previous, 0));
    sections[index]?.push(paragraph);
    wordsBefore += wordCounts[i] ?? 0;
    previous = index;
  });
  return sections.filter((section) => section.length > 0);
}

function cardText(section: readonly string[], title: string, options: CardOptions): string {
  // Split per paragraph: list items often lack end punctuation and would
  // otherwise merge into the next paragraph's first sentence.
  const sentences = section.flatMap(splitSentences);
  const scores = scoreSentences(sentences, title, options.scoring);
  const best = scores.reduce((bestIndex, score, i) => (score > (scores[bestIndex] ?? 0) ? i : bestIndex), 0);
  const first = sentences[best] ?? '';
  const next = sentences[best + 1];
  const text = countWords(first) < SHORT_CARD_WORDS && next ? `${first} ${next}` : first;
  return truncateWords(text, options.wordLimit);
}

function truncateWords(text: string, limit: number): string {
  const words = text.split(' ');
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(' ')}…`;
}
