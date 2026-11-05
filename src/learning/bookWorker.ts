/// <reference lib="webworker" />

import type { BookWorkerRequest, BookWorkerResponse, LessonCard } from '../types';
import { isTitleCase, stripGutenbergBoilerplate, splitChapters, toParagraphs } from './bookText';
import { buildCards } from './cards';
import { BOOK_SCORING, scoreSentences, summarize } from './summarizer';
import { countWords, splitSentences } from './text';

// Builds a book summary off the main thread, so the feed keeps scrolling
// while a 300 KB to 1.5 MB text is processed. Imports pure modules only.

declare const self: DedicatedWorkerGlobalScope;

const MIN_IDEAS = 8;
const MAX_IDEAS = 12;
const MAX_IDEAS_PER_CHUNK = 4;
const IDEA_WORD_LIMIT = 60;
const SUMMARY_SENTENCES = 5;
const MAX_QUOTES = 6;
const QUOTE_MIN_WORDS = 8;
const QUOTE_MAX_WORDS = 30;
const QUOTES_PER_CHUNK = 2;

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isBuildRequest(request)) return;
  try {
    self.postMessage(buildBook(request));
  } catch {
    const failure: BookWorkerResponse = { type: 'error', id: request.id, message: 'Could not summarize this book.' };
    self.postMessage(failure);
  }
});

function buildBook(request: BookWorkerRequest): BookWorkerResponse {
  const body = stripGutenbergBoilerplate(request.text);
  const chunks = splitChapters(body).map(toParagraphs).filter((p) => p.length > 0);
  const ideas = pickIdeas(chunks, request.title);
  const summary = summarize(
    ideas.map((idea) => idea.text),
    request.title,
    BOOK_SCORING,
  ).slice(0, SUMMARY_SENTENCES);
  return {
    type: 'built',
    id: request.id,
    ideas,
    summary,
    quotes: pickQuotes(chunks, request.title),
    wordCount: countWords(body),
  };
}

// Enough ideas per chunk to reach MIN_IDEAS on short books, then thinned
// evenly to at most MAX_IDEAS on long ones.
function pickIdeas(chunks: readonly (readonly string[])[], title: string): LessonCard[] {
  const perChunk = Math.min(MAX_IDEAS_PER_CHUNK, Math.max(1, Math.ceil(MIN_IDEAS / Math.max(1, chunks.length))));
  const options = {
    cardMin: perChunk,
    cardMax: perChunk,
    wordsPerCard: Number.MAX_SAFE_INTEGER,
    wordLimit: IDEA_WORD_LIMIT,
    scoring: BOOK_SCORING,
  };
  const texts = chunks.flatMap((paragraphs) => buildCards(paragraphs, title, options).map((card) => card.text));
  const step = Math.max(1, texts.length / MAX_IDEAS);
  const picked: string[] = [];
  for (let i = 0; i < texts.length && picked.length < MAX_IDEAS; i += step) {
    const text = texts[Math.floor(i)];
    if (text && !picked.includes(text)) picked.push(text);
  }
  return picked.map((text, index) => ({ index, text }));
}

function pickQuotes(chunks: readonly (readonly string[])[], title: string): string[] {
  const candidates: Array<{ readonly text: string; readonly score: number }> = [];
  for (const paragraphs of chunks) {
    const sentences = paragraphs.flatMap(splitSentences).filter((s) => {
      const words = countWords(s);
      return words >= QUOTE_MIN_WORDS && words <= QUOTE_MAX_WORDS && !isTitleCase(s);
    });
    const scores = scoreSentences(sentences, title, { minSentenceWords: QUOTE_MIN_WORDS, maxSentenceWords: QUOTE_MAX_WORDS });
    sentences
      .map((text, i) => ({ text, score: scores[i] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, QUOTES_PER_CHUNK)
      .forEach((c) => candidates.push(c));
  }
  const unique = [...new Map(candidates.map((c) => [c.text, c])).values()];
  return unique.sort((a, b) => b.score - a.score).slice(0, MAX_QUOTES).map((c) => c.text);
}

function isBuildRequest(value: unknown): value is BookWorkerRequest {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<Record<keyof BookWorkerRequest, unknown>>;
  return r.type === 'build' && typeof r.id === 'number' && typeof r.title === 'string' && typeof r.text === 'string';
}
