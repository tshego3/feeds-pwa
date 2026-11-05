import { describe, it, expect } from 'vitest';
import { parseKeyPoints } from './onDeviceSummarizer';

describe('parseKeyPoints', () => {
  it('strips star, dash, and bullet markers', () => {
    expect(parseKeyPoints('* First point\n- Second point\n• Third point')).toEqual([
      'First point',
      'Second point',
      'Third point',
    ]);
  });

  it('strips numbered markers', () => {
    expect(parseKeyPoints('1. First point\n2) Second point')).toEqual(['First point', 'Second point']);
  });

  it('drops empty lines', () => {
    expect(parseKeyPoints('* First point\n\n   \n* Second point')).toEqual(['First point', 'Second point']);
  });

  it('returns null when there is only one point', () => {
    expect(parseKeyPoints('* Only point')).toBeNull();
  });
});
