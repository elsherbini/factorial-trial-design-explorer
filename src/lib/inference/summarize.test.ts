import { describe, it, expect } from 'vitest';
import { summarizePosterior, runAllScenarios } from './summarize';
import { laplaceSample } from './laplace';
import type { PosteriorSamples } from './types';

describe('summarizePosterior', () => {
  it('returns two comparisons', () => {
    const samples: PosteriorSamples = {
      a: Array(100).fill(-2),
      b1: Array(100).fill(2),
      b2: Array(100).fill(1),
      b3: Array(100).fill(0.5)
    };
    const result = summarizePosterior(samples);
    expect(result.length).toBe(2);
    expect(result[0].comparison).toBe('Treatment+ABX vs ABX alone');
    expect(result[1].comparison).toBe('Standard+Treatment+ABX vs Standard+ABX');
  });

  it('pSuperior is 1 when all ARR > 0', () => {
    const samples: PosteriorSamples = {
      a: Array(100).fill(-3),
      b1: Array(100).fill(0),
      b2: Array(100).fill(5),
      b3: Array(100).fill(0)
    };
    const result = summarizePosterior(samples);
    expect(result[0].pSuperior).toBe(1);
  });
});

describe('runAllScenarios', () => {
  it('returns correct number of scenarios', () => {
    const results = runAllScenarios(
      [20, 35, 35, 35],
      [14, 5, 20],
      [0, 0, 0, 0],
      [1.5, 1.5, 1.5, 1.5],
      3,
      laplaceSample
    );
    expect(results.length).toBe(4);
    expect(results[0].baselineSuccesses).toBe(0);
    expect(results[3].baselineSuccesses).toBe(3);
    expect(results[0].comparisons.length).toBe(2);
  });
});
