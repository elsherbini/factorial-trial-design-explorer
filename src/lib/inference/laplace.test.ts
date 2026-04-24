import { describe, it, expect } from 'vitest';
import { laplaceSample } from './laplace';
import type { InferenceInput } from './types';

describe('laplaceSample', () => {
  const input: InferenceInput = {
    n: [20, 35, 35, 35],
    s: [0, 14, 5, 20],
    priorMeans: [0, 0, 0, 0],
    priorSds: [1.5, 1.5, 1.5, 1.5]
  };

  it('returns 4000 samples by default', () => {
    const result = laplaceSample(input);
    expect(result.a.length).toBe(4000);
    expect(result.b1.length).toBe(4000);
    expect(result.b2.length).toBe(4000);
    expect(result.b3.length).toBe(4000);
  });

  it('all samples are finite', () => {
    const result = laplaceSample(input);
    expect(result.a.every(Number.isFinite)).toBe(true);
    expect(result.b1.every(Number.isFinite)).toBe(true);
    expect(result.b2.every(Number.isFinite)).toBe(true);
    expect(result.b3.every(Number.isFinite)).toBe(true);
  });

  it('intercept (a) is negative when baseline success is 0/20', () => {
    const result = laplaceSample(input);
    const meanA = result.a.reduce((s, v) => s + v, 0) / result.a.length;
    expect(meanA).toBeLessThan(-1);
  });

  it('b1 is positive when standard care arm has higher success', () => {
    const result = laplaceSample(input);
    const meanB1 = result.b1.reduce((s, v) => s + v, 0) / result.b1.length;
    expect(meanB1).toBeGreaterThan(0);
  });
});
