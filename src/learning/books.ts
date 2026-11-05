import type { BookRef, BookWorkerRequest, BookWorkerResponse, Lesson, LessonError } from '../types';
import { getAllLessons, getLesson, saveLesson } from '../db';
import { fetchBookText } from './gutenberg';
import { coverUrl, mirrorTextUrls } from './sources';
import { countWords, readMinutes } from './text';

// Builds book lessons: mirror text in, key ideas, summary, and quotes out.
// Builds run one at a time in a Web Worker. Background builds (feed warming)
// and requested builds (Explore taps) have separate per-session limits, so
// warming never uses up the books the reader asks for.

const MAX_SESSION_BUILDS = 3;
// Background builds run only when the feed is low on unseen book ideas, one
// book at a time, so a long scroll keeps getting new books.
const MAX_BACKGROUND_BUILDS = 10;
const WORKER_TIMEOUT_MS = 60_000;

type BuiltBook = Extract<BookWorkerResponse, { type: 'built' }>;

// Session state lives in one object, read and written only in this module.
const session: { chain: Promise<unknown>; builds: Record<BuildOrigin, number>; workerSupport: boolean | null } = {
  chain: Promise.resolve(),
  builds: { background: 0, user: 0 },
  workerSupport: null,
};

type BuildOrigin = 'background' | 'user';

export interface BuildOptions {
  /** Background builds (feed warming) have their own session budget. */
  readonly background?: boolean;
}

export function bookLink(gutenbergId: number): string {
  return mirrorTextUrls(gutenbergId)[0] ?? `gutenberg:${gutenbergId}`;
}

export async function getOrBuildBook(book: BookRef, options: BuildOptions = {}): Promise<Lesson> {
  const stored = await getLesson(bookLink(book.gutenbergId));
  if (stored) return stored;
  const origin: BuildOrigin = options.background ? 'background' : 'user';
  return enqueue(() => buildAndSave(book, origin));
}

export async function listBuiltBooks(): Promise<Lesson[]> {
  return (await getAllLessons()).filter((lesson) => lesson.kind === 'book');
}

// True while background warming may still build books this session.
export function canBuildMoreBooks(): boolean {
  return session.builds.background < MAX_BACKGROUND_BUILDS && supportsBookWorker();
}

// Module workers need Safari 15+ / Chrome 80+. Reading `type` from the
// options object only happens in browsers that support it.
export function supportsBookWorker(): boolean {
  if (session.workerSupport !== null) return session.workerSupport;
  let supported = false;
  try {
    const probe = new Worker('data:,', {
      get type(): WorkerType {
        supported = true;
        return 'module';
      },
    });
    probe.terminate();
  } catch {
    // Creating the probe can throw on a data: URL; `supported` is already set.
  }
  session.workerSupport = supported;
  return supported;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = session.chain.then(task, task);
  session.chain = run.catch(() => undefined);
  return run;
}

async function buildAndSave(book: BookRef, origin: BuildOrigin): Promise<Lesson> {
  const link = bookLink(book.gutenbergId);
  const already = await getLesson(link);
  if (already) return already;
  if (!supportsBookWorker()) throw lessonError('Book summaries need a newer browser.');
  if (session.builds[origin] >= (origin === 'background' ? MAX_BACKGROUND_BUILDS : MAX_SESSION_BUILDS)) throw lessonError('More book summaries next time you open the app.');
  session.builds[origin] += 1;

  const text = await fetchBookText(book.gutenbergId);
  const built = await runWorker({ type: 'build', id: book.gutenbergId, title: book.title, text });
  const lesson: Lesson = {
    link,
    feedId: 0,
    title: book.title,
    feedTitle: book.author,
    imageUrl: coverUrl(book.gutenbergId),
    summary: built.summary,
    summarySource: 'extractive',
    cards: built.ideas,
    wordCount: built.wordCount,
    readMinutes: readMinutes(countWords(built.ideas.map((idea) => idea.text).join(' '))),
    createdAt: Date.now(),
    kind: 'book',
    author: book.author,
    quotes: built.quotes,
  };
  await saveLesson(lesson);
  return lesson;
}

function runWorker(request: BookWorkerRequest): Promise<BuiltBook> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./bookWorker.ts', import.meta.url), { type: 'module' });
    let timer = 0;
    const finish = (settle: () => void) => {
      window.clearTimeout(timer);
      worker.terminate();
      settle();
    };
    timer = window.setTimeout(() => finish(() => reject(lessonError('Summarizing took too long.'))), WORKER_TIMEOUT_MS);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (isBuilt(data, request.id)) finish(() => resolve(data));
      else finish(() => reject(lessonError('Could not summarize this book.')));
    };
    worker.onerror = () => finish(() => reject(lessonError('Could not summarize this book.')));
    worker.postMessage(request);
  });
}

function isBuilt(value: unknown, id: number): value is BuiltBook {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<Record<keyof BuiltBook, unknown>>;
  return v.type === 'built' && v.id === id && Array.isArray(v.ideas) && Array.isArray(v.summary) && Array.isArray(v.quotes);
}

function lessonError(message: string): LessonError {
  return { type: 'extraction', message };
}
