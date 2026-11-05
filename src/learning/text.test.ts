import { describe, it, expect } from 'vitest';
import { countWords, MAX_SENTENCES, readMinutes, splitSentences, tokenize } from './text';

describe('splitSentences', () => {
  it('splits three plain sentences', () => {
    expect(splitSentences('The sun rose. Birds sang loudly! Was it spring?')).toEqual([
      'The sun rose.',
      'Birds sang loudly!',
      'Was it spring?',
    ]);
  });

  it('keeps an abbreviation such as "Dr. Smith" in one sentence', () => {
    expect(splitSentences('We met Dr. Smith today. He was late.')).toEqual([
      'We met Dr. Smith today.',
      'He was late.',
    ]);
  });

  it('stops at MAX_SENTENCES', () => {
    const text = Array.from({ length: MAX_SENTENCES + 50 }, (_, i) => `Sentence ${i} ends here.`).join(' ');
    expect(splitSentences(text)).toHaveLength(MAX_SENTENCES);
  });
});

describe('tokenize', () => {
  it('drops stopwords and tokens shorter than three characters', () => {
    expect(tokenize('The market is up by 5% as investors buy shares')).toEqual([
      'market',
      'investors',
      'buy',
      'shares',
    ]);
  });
});

describe('countWords', () => {
  it('counts words across extra whitespace', () => {
    expect(countWords('  one   two\n\tthree  ')).toBe(3);
  });
});

describe('readMinutes', () => {
  it('returns at least one minute and rounds up', () => {
    expect(readMinutes(0)).toBe(1);
    expect(readMinutes(401)).toBe(3);
  });
});
