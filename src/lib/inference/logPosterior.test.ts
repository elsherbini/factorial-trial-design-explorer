import { describe, it, expect } from 'vitest';
import { logPosterior, buildDesignMatrix, logistic } from './logPosterior';

describe('logistic', () => {
  it('returns 0.5 at x=0', () => {
    expect(logistic(0)).toBeCloseTo(0.5);
  });

  it('approaches 1 for large positive x', () => {
    expect(logistic(10)).toBeCloseTo(1, 4);
  });

  it('approaches 0 for large negative x', () => {
    expect(logistic(-10)).toBeCloseTo(0, 4);
  });
});

describe('buildDesignMatrix', () => {
  it('creates correct rows for simple input', () => {
    const { X, y } = buildDesignMatrix([2, 2, 2, 2], [1, 1, 1, 1]);
    expect(X.length).toBe(8);
    expect(y.length).toBe(8);
    // First arm: std_care=0, treatment=0
    expect(X[0]).toEqual([1, 0, 0, 0]);
    // Second arm: std_care=1, treatment=0
    expect(X[2]).toEqual([1, 1, 0, 0]);
    // Third arm: std_care=0, treatment=1
    expect(X[4]).toEqual([1, 0, 1, 0]);
    // Fourth arm: std_care=1, treatment=1
    expect(X[6]).toEqual([1, 1, 1, 1]);
    // Successes come first in each arm
    expect(y[0]).toBe(1); // arm 1 success
    expect(y[1]).toBe(0); // arm 1 failure
  });
});

describe('logPosterior', () => {
  it('returns a finite number', () => {
    const { X, y } = buildDesignMatrix([20, 35, 35, 35], [0, 14, 5, 20]);
    const beta = [0, 0, 0, 0];
    const means = [0, 0, 0, 0];
    const sds = [1.5, 1.5, 1.5, 1.5];
    const result = logPosterior(beta, X, y, means, sds);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('is higher at a better-fitting beta', () => {
    const { X, y } = buildDesignMatrix([10, 10, 10, 10], [0, 10, 0, 10]);
    const means = [0, 0, 0, 0];
    const sds = [10, 10, 10, 10];
    const betaGood = [-5, 10, 0, 0];
    const betaFlat = [0, 0, 0, 0];
    expect(logPosterior(betaGood, X, y, means, sds)).toBeGreaterThan(
      logPosterior(betaFlat, X, y, means, sds)
    );
  });
});
