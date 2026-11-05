import type { FeedItem, Lesson, LessonError, LessonRequest, SummarySource } from '../types';
import { getAllArticles, getAllLessons, getLesson, saveLesson } from '../db';
import { getOrBuildBook } from './books';
import { buildCards } from './cards';
import { extractParagraphs } from './extractor';
import { summarizeOnDevice } from './onDeviceSummarizer';
import { summarize } from './summarizer';
import { countWords, readMinutes, splitSentences } from './text';

const MIN_LESSON_WORDS = 60;
const SUGGESTION_LIMIT = 10;

interface LessonSummary {
  readonly summary: readonly string[];
  readonly summarySource: SummarySource;
}

export async function getOrCreateLesson(request: LessonRequest): Promise<Lesson> {
  if (request.book) return getOrBuildBook(request.book);
  const stored = await getLesson(request.link);
  if (stored) return stored;

  const paragraphs = await loadParagraphs(request);
  const text = paragraphs.join(' ');
  const wordCount = countWords(text);
  if (wordCount < MIN_LESSON_WORDS) throw shortLessonError();

  const lesson: Lesson = {
    link: request.link,
    feedId: request.feedId,
    title: request.title,
    feedTitle: request.feedTitle,
    imageUrl: request.imageUrl,
    ...(await buildSummary(paragraphs, text, request.title)),
    cards: buildCards(paragraphs, request.title),
    wordCount,
    readMinutes: readMinutes(wordCount),
    createdAt: Date.now(),
  };
  await saveLesson(lesson);
  return lesson;
}

export function listLessons(): Promise<Lesson[]> {
  return getAllLessons();
}

export async function listSuggestions(limit = SUGGESTION_LIMIT): Promise<FeedItem[]> {
  const [articles, lessons] = await Promise.all([getAllArticles(), getAllLessons()]);
  const taken = new Set(lessons.map((lesson) => lesson.link));
  const newest = [...articles].sort((a, b) => publishedAt(b) - publishedAt(a));
  const picked: FeedItem[] = [];
  for (const article of newest) {
    if (picked.length >= limit) break;
    if (taken.has(article.link)) continue;
    // The same link can be cached under two feeds; suggest it once.
    taken.add(article.link);
    picked.push(article);
  }
  return picked;
}

// Readability output first; the feed's own description when the page could
// not be fetched or parsed (paywall, bot check, offline).
async function loadParagraphs(request: LessonRequest): Promise<readonly string[]> {
  const extracted = await extractParagraphs(request.link).catch(() => []);
  if (extracted.length > 0) return extracted;
  if (countWords(request.description) < MIN_LESSON_WORDS && !navigator.onLine) {
    throw offlineError();
  }
  return [request.description];
}

async function buildSummary(
  paragraphs: readonly string[],
  text: string,
  title: string,
): Promise<LessonSummary> {
  const onDevice = await summarizeOnDevice(text, title);
  if (onDevice) return { summary: onDevice, summarySource: 'on-device' };
  // Split per paragraph so unpunctuated list items stay separate sentences.
  const sentences = paragraphs.flatMap(splitSentences);
  return { summary: summarize(sentences, title), summarySource: 'extractive' };
}

function publishedAt(article: FeedItem): number {
  const time = Date.parse(article.pubDate);
  return Number.isNaN(time) ? 0 : time;
}

function shortLessonError(): LessonError {
  return { type: 'too-short', message: 'This article is too short for a lesson.' };
}

function offlineError(): LessonError {
  return { type: 'network', message: 'You are offline. Connect to build this lesson.' };
}
