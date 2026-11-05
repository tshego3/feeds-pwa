import { describe, it, expect } from 'vitest';
import { BOOK_SCORING, scoreSentences, summarize, SUMMARY_MAX, SUMMARY_MIN } from './summarizer';

const TOPICS = ['solar', 'battery', 'grid', 'tariff', 'storage', 'demand', 'turbine', 'coal', 'export', 'policy'];

function makeSentences(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `The ${TOPICS[i % TOPICS.length]} plan number ${i} changes how energy reaches homes across the region.`,
  );
}

describe('summarize', () => {
  it('returns between three and five sentences for a 30-sentence text', () => {
    const summary = summarize(makeSentences(30), 'Energy plan');
    expect(summary.length).toBeGreaterThanOrEqual(SUMMARY_MIN);
    expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
  });

  it('keeps the picked sentences in article order', () => {
    const sentences = makeSentences(30);
    const positions = summarize(sentences, 'Energy plan').map((s) => sentences.indexOf(s));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('does not pick two near-duplicate sentences', () => {
    const duplicate = 'Solar battery storage lowers grid demand during the evening peak for most homes.';
    const sentences = [duplicate, duplicate, ...makeSentences(20)];
    const summary = summarize(sentences, 'Solar battery storage');
    expect(summary.filter((s) => s === duplicate).length).toBeLessThanOrEqual(1);
  });

  it('returns both sentences of a two-sentence text', () => {
    const sentences = ['First short sentence here.', 'Second short sentence here.'];
    expect(summarize(sentences, 'Title')).toEqual(sentences);
  });
});

describe('scoreSentences', () => {
  it('gives zero to a sentence under six words', () => {
    const [score] = scoreSentences(['Markets fell sharply.'], 'Markets');
    expect(score).toBe(0);
  });
});

describe('book scoring options', () => {
  it('keeps a 60-word sentence that article scoring drops', () => {
    const long = `${Array.from({ length: 59 }, (_, i) => `virtue${i}`).join(' ')} endures.`;
    expect(scoreSentences([long], 'Virtue')[0]).toBe(0);
    expect(scoreSentences([long], 'Virtue', BOOK_SCORING)[0]).toBeGreaterThan(0);
  });
});
