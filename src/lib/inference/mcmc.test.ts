import { describe, it, expect } from 'vitest';
import { mcmcSample } from './mcmc';
import type { InferenceInput } from './types';

describe('mcmcSample', () => {
  const input: InferenceInput = {
    n: [20, 35, 35, 35],
    s: [0, 14, 5, 20],
    priorMeans: [0, 0, 0, 0],
    priorSds: [1.5, 1.5, 1.5, 1.5]
  };

  it('returns correct number of samples', () => {
    const result = mcmcSample(input, 500, 200);
    expect(result.a.length).toBe(500);
    expect(result.b1.length).toBe(500);
  });

  it('all samples are finite', () => {
    const result = mcmcSample(input, 500, 200);
    expect(result.a.every(Number.isFinite)).toBe(true);
    expect(result.b3.every(Number.isFinite)).toBe(true);
  });
});
