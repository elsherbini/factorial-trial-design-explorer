import { logistic } from './logPosterior';
import type { PosteriorSamples } from './types';

export interface ComparisonSummary {
  comparison: string;
  pSuperior: number;
  arrMedian: number;
  arrLo: number;
  arrHi: number;
  nntMedian: number | null;
  nntLo: number | null;
  nntHi: number | null;
  arrSamples: number[];
  pInteraction: number;
  b3Samples: number[];
}

export interface ScenarioResult {
  baselineSuccesses: number;
  comparisons: ComparisonSummary[];
  posteriorSamples: PosteriorSamples;
}

function quantile(arr: number[], q: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function median(arr: number[]): number {
  return quantile(arr, 0.5);
}

function summarizeComparison(
  arr: number[],
  b3: number[],
  label: string
): ComparisonSummary {
  const pSuperior = arr.filter((v) => v > 0).length / arr.length;
  const nnt = arr.map((v) => (v > 0 ? 1 / v : NaN));
  const nntValid = nnt.filter(Number.isFinite);

  return {
    comparison: label,
    pSuperior,
    arrMedian: median(arr),
    arrLo: quantile(arr, 0.05),
    arrHi: quantile(arr, 0.95),
    nntMedian: nntValid.length > 0 ? median(nntValid) : null,
    nntLo: nntValid.length > 0 ? quantile(nntValid, 0.05) : null,
    nntHi: nntValid.length > 0 ? quantile(nntValid, 0.95) : null,
    arrSamples: arr,
    pInteraction: b3.filter((v) => v > 0).length / b3.length,
    b3Samples: b3
  };
}

export function summarizePosterior(samples: PosteriorSamples): ComparisonSummary[] {
  const n = samples.a.length;
  const arrTrt: number[] = new Array(n);
  const arrTrtStd: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const p1 = logistic(samples.a[i]);
    const p2 = logistic(samples.a[i] + samples.b1[i]);
    const p3 = logistic(samples.a[i] + samples.b2[i]);
    const p4 = logistic(samples.a[i] + samples.b1[i] + samples.b2[i] + samples.b3[i]);
    arrTrt[i] = p3 - p1;
    arrTrtStd[i] = p4 - p2;
  }

  return [
    summarizeComparison(arrTrt, samples.b3, 'Treatment+ABX vs ABX alone'),
    summarizeComparison(arrTrtStd, samples.b3, 'Standard+Treatment+ABX vs Standard+ABX')
  ];
}

/**
 * Run inference for a single baseline scenario.
 */
export function runScenario(
  n: [number, number, number, number],
  sTreatment: [number, number, number],
  baselineSuccesses: number,
  priorMeans: [number, number, number, number],
  priorSds: [number, number, number, number],
  sampleFn: (input: { n: [number, number, number, number]; s: [number, number, number, number]; priorMeans: [number, number, number, number]; priorSds: [number, number, number, number] }) => PosteriorSamples
): ScenarioResult {
  const s: [number, number, number, number] = [baselineSuccesses, ...sTreatment];
  const samples = sampleFn({ n, s, priorMeans, priorSds });
  return {
    baselineSuccesses,
    comparisons: summarizePosterior(samples),
    posteriorSamples: samples
  };
}

/**
 * Run inference across baseline 0..maxBaseline.
 */
export function runAllScenarios(
  n: [number, number, number, number],
  sTreatment: [number, number, number],
  priorMeans: [number, number, number, number],
  priorSds: [number, number, number, number],
  maxBaseline: number,
  sampleFn: (input: { n: [number, number, number, number]; s: [number, number, number, number]; priorMeans: [number, number, number, number]; priorSds: [number, number, number, number] }) => PosteriorSamples
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  for (let s1 = 0; s1 <= maxBaseline; s1++) {
    results.push(runScenario(n, sTreatment, s1, priorMeans, priorSds, sampleFn));
  }
  return results;
}
