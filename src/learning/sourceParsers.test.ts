import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './entities';
import { nextBook, toBookCatalog } from './catalog';
import { toTopicSummary } from './wikipedia';
import { stableShuffle, toQuizQuestion } from './trivia';

const LONG = 'A cognitive bias is a systematic pattern of deviation from norm or rationality in judgment. '.repeat(3);

describe('toBookCatalog and nextBook', () => {
  const catalog = toBookCatalog({
    generatedAt: 'x',
    catalogDate: '2026-11-01',
    interests: {
      philosophy: [{ gutenbergId: 2680, title: 'Meditations', author: 'Marcus Aurelius', interest: 'philosophy', sitelinks: 51 }, { gutenbergId: 'bad' }],
      money: [{ gutenbergId: 3300, title: 'Wealth of Nations', author: 'Adam Smith', interest: 'money', sitelinks: 44 }],
    },
  });

  it('drops an entry with a non-numeric id', () => {
    expect(catalog.interests.philosophy).toHaveLength(1);
  });

  it('skips excluded ids and rotates interests', () => {
    const first = nextBook(catalog, ['philosophy', 'money'], new Set(), 0);
    expect(first.book?.gutenbergId).toBe(2680);
    expect(nextBook(catalog, ['philosophy', 'money'], new Set([2680]), first.cursor).book?.gutenbergId).toBe(3300);
  });
});

describe('toTopicSummary', () => {
  const page = { title: 'Cognitive bias', extract: LONG, fullurl: 'https://en.wikipedia.org/wiki/Cognitive_bias' };

  it('drops list pages, titles with a year, and short extracts', () => {
    expect(toTopicSummary({ ...page, title: 'List of cognitive biases' })).toBeNull();
    expect(toTopicSummary({ ...page, title: '2022 New Zealand fuel tax subsidy' })).toBeNull();
    expect(toTopicSummary({ ...page, extract: 'Too short.' })).toBeNull();
  });

  it('rejects a non-https image URL', () => {
    const topic = toTopicSummary({ ...page, thumbnail: { source: 'http://upload.wikimedia.org/x.jpg' } });
    expect(topic?.thumbnailUrl).toBeUndefined();
  });
});

describe('toQuizQuestion', () => {
  const raw = {
    category: 'Science &amp; Nature',
    difficulty: 'easy',
    question: 'What cell organelle is known as &quot;the powerhouse of the cell?&quot;',
    correct_answer: 'Mitochondria',
    incorrect_answers: ['Ribosome', 'Nucleus', 'Golgi&#039;s body'],
  };

  it('decodes entities and keeps the correct answer among the options', () => {
    const quiz = toQuizQuestion(raw);
    expect(quiz?.question).toBe('What cell organelle is known as "the powerhouse of the cell?"');
    expect(quiz?.options).toContain('Mitochondria');
    expect(quiz?.options).toContain("Golgi's body");
    expect(quiz?.categoryName).toBe('Science & Nature');
  });

  it('orders options the same way every time', () => {
    expect(stableShuffle(['a', 'b', 'c', 'd'], 'seed')).toEqual(stableShuffle(['d', 'c', 'b', 'a'], 'seed'));
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes &amp; last so an escaped entity stays literal', () => {
    expect(decodeHtmlEntities('&amp;quot;')).toBe('&quot;');
  });
});
