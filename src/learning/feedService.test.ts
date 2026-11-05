import { describe, it, expect } from 'vitest';
import { weightedMerge } from './feedService';

describe('weightedMerge', () => {
  it('takes two top-feed items for each other item', () => {
    expect(weightedMerge(['t1', 't2', 't3', 't4'], ['o1', 'o2'], 2)).toEqual(['t1', 't2', 'o1', 't3', 't4', 'o2']);
  });

  it('keeps going when one side runs out', () => {
    expect(weightedMerge(['t1'], ['o1', 'o2', 'o3'], 2)).toEqual(['t1', 'o1', 'o2', 'o3']);
  });
});
