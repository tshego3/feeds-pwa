import { describe, it, expect } from 'vitest';
import { ARTICLE_CARDS, buildCards, CARD_WORD_LIMIT } from './cards';
import { countWords } from './text';

// One paragraph of `sentences` ten-word sentences.
function paragraph(id: number, sentences: number): string {
  return Array.from(
    { length: sentences },
    (_, i) => `Section ${id} point ${i} explains why local energy prices keep rising.`,
  ).join(' ');
}

function paragraphs(count: number, sentencesEach: number): string[] {
  return Array.from({ length: count }, (_, i) => paragraph(i, sentencesEach));
}

describe('buildCards', () => {
  it('yields eight cards for a 1,500-word text', () => {
    expect(buildCards(paragraphs(15, 10), 'Energy prices')).toHaveLength(8);
  });

  it('yields four cards for a 300-word text with four or more paragraphs', () => {
    expect(buildCards(paragraphs(6, 5), 'Energy prices')).toHaveLength(4);
  });

  it('yields at most two cards for two paragraphs', () => {
    expect(buildCards(paragraphs(2, 40), 'Energy prices').length).toBeLessThanOrEqual(2);
  });

  it('never yields an empty card', () => {
    for (const card of buildCards(paragraphs(9, 7), 'Energy prices')) {
      expect(card.text.trim()).not.toBe('');
    }
  });

  it('cuts long cards at the word limit with an ellipsis', () => {
    const longSentence = `${Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ')}.`;
    const [card] = buildCards([longSentence, longSentence, longSentence, longSentence], 'Words');
    expect(card).toBeDefined();
    expect(countWords(card?.text ?? '')).toBeLessThanOrEqual(CARD_WORD_LIMIT);
    expect(card?.text.endsWith('…')).toBe(true);
  });

  it('numbers cards from zero in order', () => {
    const cards = buildCards(paragraphs(12, 8), 'Energy prices');
    expect(cards.map((c) => c.index)).toEqual(cards.map((_, i) => i));
  });
});

describe('buildCards options', () => {
  it('honors cardMin and cardMax', () => {
    const options = { ...ARTICLE_CARDS, cardMin: 2, cardMax: 2, wordsPerCard: Number.MAX_SAFE_INTEGER };
    expect(buildCards(paragraphs(10, 5), 'Energy prices', options)).toHaveLength(2);
  });
});
