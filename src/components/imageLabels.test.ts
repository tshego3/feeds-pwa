import { describe, it, expect } from 'vitest';
import { monogram, sourceLabel } from './imageLabels';

describe('monogram', () => {
  it('takes the first letters of up to two words', () => {
    expect(monogram('Daily Investor')).toBe('DI');
    expect(monogram('WIRED')).toBe('W');
    expect(monogram('Stack Overflow')).toBe('SO');
  });

  it('falls back to a dot when the label has no letters', () => {
    expect(monogram('2026')).toBe('\u00B7');
  });
});

describe('sourceLabel', () => {
  it('prefers the feed title', () => {
    expect(sourceLabel('https://techcrunch.com/x', 'TechCrunch')).toBe('TechCrunch');
  });

  it('names the site from its host, including country domains', () => {
    expect(sourceLabel('https://stackoverflow.blog/2026/x')).toBe('Stackoverflow');
    expect(sourceLabel('https://mybroadband.co.za/news/x')).toBe('Mybroadband');
    expect(sourceLabel('https://www.wired.com/story/x')).toBe('Wired');
  });
});
