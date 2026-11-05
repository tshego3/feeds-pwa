import { clamp, countWords, tokenize } from './text';

// Extractive summarizer: ranks sentences by term frequency with small boosts
// for the lead and for title words, then keeps the best few in article order.

export const SUMMARY_MIN = 3;
export const SUMMARY_MAX = 5;

const SUMMARY_RATIO = 0.15;
export interface ScoringOptions {
  readonly minSentenceWords: number;
  readonly maxSentenceWords: number;
}

export const ARTICLE_SCORING: ScoringOptions = { minSentenceWords: 6, maxSentenceWords: 45 };
// Older prose runs long; a 45-word cap would discard most of a classic.
export const BOOK_SCORING: ScoringOptions = { minSentenceWords: 8, maxSentenceWords: 70 };
const LEAD_RATIO = 0.1;
const LEAD_BOOST = 0.2;
const TITLE_BOOST = 0.1;
const MAX_TITLE_HITS = 3;
const DUPLICATE_SIMILARITY = 0.6;
// Just under 1: rejects only sentences with identical token sets.
const EXACT_MATCH = 0.999;

export function scoreSentences(
  sentences: readonly string[],
  title: string,
  options: ScoringOptions = ARTICLE_SCORING,
): number[] {
  const tokenLists = sentences.map(tokenize);
  const weights = termWeights(tokenLists);
  const titleTokens = new Set(tokenize(title));
  const leadCount = Math.max(1, Math.ceil(sentences.length * LEAD_RATIO));

  return sentences.map((sentence, index) => {
    const tokens = tokenLists[index] ?? [];
    const words = countWords(sentence);
    if (tokens.length === 0 || words < options.minSentenceWords || words > options.maxSentenceWords) return 0;
    const weight = tokens.reduce((sum, token) => sum + (weights.get(token) ?? 0), 0);
    const base = weight / Math.sqrt(tokens.length);
    const lead = index < leadCount ? LEAD_BOOST : 0;
    const titleHits = Math.min(MAX_TITLE_HITS, [...new Set(tokens)].filter((t) => titleTokens.has(t)).length);
    return base * (1 + lead + titleHits * TITLE_BOOST);
  });
}

export function summarize(
  sentences: readonly string[],
  title: string,
  options: ScoringOptions = ARTICLE_SCORING,
): string[] {
  if (sentences.length <= SUMMARY_MIN) return [...sentences];

  const target = clamp(Math.round(sentences.length * SUMMARY_RATIO), SUMMARY_MIN, SUMMARY_MAX);
  const ranked = scoreSentences(sentences, title, options)
    .map((score, index) => ({ score, index }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const picked = pickDistinct(sentences, ranked, target, DUPLICATE_SIMILARITY);
  // Very repetitive text can leave too few distinct picks: top up, refusing
  // only exact token matches.
  if (picked.length < SUMMARY_MIN) {
    picked.push(...pickDistinct(sentences, ranked, SUMMARY_MIN, EXACT_MATCH, picked).slice(picked.length));
  }

  // Nothing scored (every sentence too short or too long): keep the lead.
  if (picked.length === 0) return sentences.slice(0, target);
  return picked
    .map((p) => p.index)
    .sort((a, b) => a - b)
    .map((index) => sentences[index] ?? '')
    .filter((sentence) => sentence !== '');
}

interface Pick {
  readonly index: number;
  readonly tokens: ReadonlySet<string>;
}

// Walks the ranking and keeps sentences whose overlap with every kept one is
// at or below maxSimilarity. `seed` entries count as already kept.
function pickDistinct(
  sentences: readonly string[],
  ranked: readonly { readonly index: number }[],
  target: number,
  maxSimilarity: number,
  seed: readonly Pick[] = [],
): Pick[] {
  const picked: Pick[] = [...seed];
  for (const candidate of ranked) {
    if (picked.length >= target) break;
    if (picked.some((p) => p.index === candidate.index)) continue;
    const tokens = new Set(tokenize(sentences[candidate.index] ?? ''));
    if (picked.some((p) => jaccard(p.tokens, tokens) > maxSimilarity)) continue;
    picked.push({ index: candidate.index, tokens });
  }
  return picked;
}

function termWeights(tokenLists: readonly (readonly string[])[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tokens of tokenLists) {
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const highest = Math.max(1, ...counts.values());
  return new Map([...counts].map(([token, count]) => [token, count / highest]));
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / (a.size + b.size - shared);
}
