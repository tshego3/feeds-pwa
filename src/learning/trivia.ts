import type { InterestId, QuizDifficulty, QuizQuestion } from '../types';
import { getCached, putCached } from '../db';
import { decodeHtmlEntities } from './entities';
import { blockHost, limitedFetch } from './http';
import { TRIVIA_API, sourceFor } from './sources';

// Quiz cards from Open Trivia DB (CC BY-SA 4.0). The API allows one request
// per 5 s per IP, so questions are fetched 10 at a time and pooled in
// IndexedDB. A session token keeps the API from repeating questions.

const TIMEOUT_MS = 10_000;
const TOKEN_KEY = 'trivia:token';
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const POOL_REFILL_AT = 3;
const TRIVIA_HOST = new URL(TRIVIA_API).host;

const RESPONSE_OK = 0;
const RESPONSE_TOKEN_NOT_FOUND = 3;
const RESPONSE_TOKEN_EMPTY = 4;
const RESPONSE_RATE_LIMIT = 5;

export async function nextQuiz(interest: InterestId, round: number): Promise<QuizQuestion | null> {
  const categories = sourceFor(interest)?.triviaCategories ?? [];
  const category = categories[round % Math.max(1, categories.length)];
  if (category === undefined) return null;

  const pool = await readPool(category);
  const [next, ...rest] = pool;
  await writePool(category, rest);
  // Refill in the background: the API allows one call per 5 s, which would
  // otherwise hold up the feed. An empty pool fills for the next load.
  if (rest.length <= POOL_REFILL_AT) void refillPool(category);
  return next ?? null;
}

async function refillPool(category: number): Promise<void> {
  const fresh = await fetchQuizBatch(category).catch(() => []);
  if (fresh.length === 0) return;
  const pool = await readPool(category);
  const known = new Set(pool.map((q) => q.id));
  await writePool(category, [...pool, ...fresh.filter((q) => !known.has(q.id))]);
}

export async function fetchQuizBatch(category: number): Promise<QuizQuestion[]> {
  const token = await getSessionToken();
  const url = `${TRIVIA_API}/api.php?amount=10&category=${category}&type=multiple${token ? `&token=${token}` : ''}`;
  const data = await fetchJson(url);
  const code = typeof data?.response_code === 'number' ? data.response_code : -1;
  if (code === RESPONSE_RATE_LIMIT) blockHost(TRIVIA_HOST);
  if ((code === RESPONSE_TOKEN_NOT_FOUND || code === RESPONSE_TOKEN_EMPTY) && token) await resetToken(token);
  if (code !== RESPONSE_OK || !Array.isArray(data?.results)) return [];
  return data.results.map(toQuizQuestion).filter((q): q is QuizQuestion => q !== null);
}

async function getSessionToken(): Promise<string | null> {
  const cached = await getCached(TOKEN_KEY).catch(() => undefined);
  if (cached && Date.now() - cached.fetchedAt < TOKEN_TTL_MS) return cached.body;
  const data = await fetchJson(`${TRIVIA_API}/api_token.php?command=request`).catch(() => null);
  const token = typeof data?.token === 'string' ? data.token : null;
  if (token) await putCached(TOKEN_KEY, token).catch(() => undefined);
  return token;
}

async function resetToken(token: string): Promise<void> {
  await fetchJson(`${TRIVIA_API}/api_token.php?command=reset&token=${encodeURIComponent(token)}`).catch(() => null);
}

interface TriviaBody {
  readonly response_code?: unknown;
  readonly results?: unknown;
  readonly token?: unknown;
}

async function fetchJson(url: string): Promise<TriviaBody | null> {
  const res = await limitedFetch(url, { timeoutMs: TIMEOUT_MS });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  return typeof data === 'object' && data !== null ? (data as TriviaBody) : null;
}

export function toQuizQuestion(value: unknown): QuizQuestion | null {
  if (typeof value !== 'object' || value === null) return null;
  const r = value as Record<string, unknown>;
  const incorrect = Array.isArray(r.incorrect_answers) ? r.incorrect_answers.filter(isText) : [];
  if (!isText(r.question) || !isText(r.correct_answer) || incorrect.length !== 3) return null;
  const question = decodeHtmlEntities(r.question);
  const correct = decodeHtmlEntities(r.correct_answer);
  const id = hashText(question);
  return {
    id,
    question,
    correct,
    options: stableShuffle([correct, ...incorrect.map(decodeHtmlEntities)], id),
    difficulty: toDifficulty(r.difficulty),
    categoryName: isText(r.category) ? decodeHtmlEntities(r.category) : 'Trivia',
  };
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function toDifficulty(value: unknown): QuizDifficulty {
  return value === 'easy' || value === 'hard' ? value : 'medium';
}

// FNV-1a: a short, stable id per question.
export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

// Orders options by a per-option hash seeded with the question id, so the
// same question always shows the same order and the answer is not always first.
export function stableShuffle(options: readonly string[], seed: string): string[] {
  return [...options].sort((a, b) => hashText(`${seed}:${a}`).localeCompare(hashText(`${seed}:${b}`)));
}

async function readPool(category: number): Promise<QuizQuestion[]> {
  const cached = await getCached(poolKey(category)).catch(() => undefined);
  if (!cached) return [];
  try {
    const parsed = JSON.parse(cached.body) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isQuizQuestion) : [];
  } catch {
    // A corrupt pool is simply refilled.
    return [];
  }
}

function writePool(category: number, pool: readonly QuizQuestion[]): Promise<void> {
  return putCached(poolKey(category), JSON.stringify(pool)).catch(() => undefined);
}

function poolKey(category: number): string {
  return `trivia:pool:${category}`;
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== 'object' || value === null) return false;
  const q = value as Partial<Record<keyof QuizQuestion, unknown>>;
  return isText(q.id) && isText(q.question) && isText(q.correct) && Array.isArray(q.options);
}
