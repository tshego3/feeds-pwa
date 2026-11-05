import { describe, it, expect } from 'vitest';
import { splitChapters, stripGutenbergBoilerplate, toParagraphs } from './bookText';

function words(count: number, word = 'virtue'): string {
  return Array.from({ length: count }, () => word).join(' ');
}

describe('stripGutenbergBoilerplate', () => {
  it('keeps only the text between the start and end markers', () => {
    const text = 'License\n*** START OF THE PROJECT GUTENBERG EBOOK MEDITATIONS ***\nBody text\n*** END OF THE PROJECT GUTENBERG EBOOK MEDITATIONS ***\nMore license';
    expect(stripGutenbergBoilerplate(text)).toBe('Body text');
  });

  it('returns the whole text when the markers are missing', () => {
    expect(stripGutenbergBoilerplate('  Plain book  ')).toBe('Plain book');
  });
});

describe('splitChapters', () => {
  it('splits on numbered chapter and book headings', () => {
    const text = ['CHAPTER I', words(400), 'CHAPTER II', words(400), 'BOOK III', words(400), 'CHAPTER IV', words(400)].join('\n\n');
    expect(splitChapters(text)).toHaveLength(4);
  });

  it('falls back to 3,000-word chunks when headings are missing', () => {
    const text = Array.from({ length: 9 }, () => words(1000, 'reason')).join('\n\n');
    expect(splitChapters(text)).toHaveLength(3);
  });

  it('caps the result at 24 chunks', () => {
    const text = Array.from({ length: 30 }, (_, i) => `CHAPTER ${i + 1}\n\n${words(350)}`).join('\n\n');
    expect(splitChapters(text)).toHaveLength(24);
  });
});

describe('toParagraphs', () => {
  it('joins wrapped lines and drops headings and short lines', () => {
    const chunk = 'THE FIRST BOOK\n\nOf my grandfather Verus I have learned\nto be gentle and meek.\n\n42';
    expect(toParagraphs(chunk)).toEqual(['Of my grandfather Verus I have learned to be gentle and meek.']);
  });

  it('drops ASCII diagrams and strips a leading section heading', () => {
    const chunk = '| | POINTLAND LINELAND | | ___ __ | |\n\nSection II Of the possibility of a conjunction of the manifold in general.';
    expect(toParagraphs(chunk)).toEqual(['Of the possibility of a conjunction of the manifold in general.']);
  });

  it('drops a Title Case section title that leads a paragraph', () => {
    const chunk = 'Transcendental Deduction of the Pure Conceptions. Human reason is called upon to consider questions which it cannot decline.';
    expect(toParagraphs(chunk)).toEqual(['Human reason is called upon to consider questions which it cannot decline.']);
  });

  it('drops a paragraph that is only a Title Case section title', () => {
    const chunk = 'Transcendental Deduction of the Pure Conceptions of the Understanding.\n\nHuman reason is called upon to consider questions which it cannot decline.';
    expect(toParagraphs(chunk)).toEqual(['Human reason is called upon to consider questions which it cannot decline.']);
  });
});
