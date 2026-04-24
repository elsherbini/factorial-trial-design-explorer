import { laplaceSample } from './inference/laplace';
import { mcmcSample } from './inference/mcmc';
import { runAllScenarios, type ScenarioResult } from './inference/summarize';
import type { InferenceMethod } from './inference/types';

class AppState {
  // --- Inputs ---
  armSizes = $state<[number, number, number, number]>([20, 35, 35, 35]);
  priorPreset = $state<'weakly' | 'skeptical' | 'custom'>('weakly');
  customPriorMeans = $state<[number, number, number, number]>([0, 0, 0, 0]);
  customPriorSds = $state<[number, number, number, number]>([1.5, 1.5, 1.5, 1.5]);
  method = $state<InferenceMethod>('laplace');
  contingencySuccesses = $state<[number, number, number]>([14, 5, 20]);
  contingencyFailures = $state<[number, number, number]>([21, 30, 15]);

  // --- Derived ---
  get priorMeans(): [number, number, number, number] {
    return this.priorPreset === 'custom' ? this.customPriorMeans : [0, 0, 0, 0];
  }

  get priorSds(): [number, number, number, number] {
    return this.priorPreset === 'skeptical'
      ? [1.5, 1.5, 0.5, 0.5]
      : this.priorPreset === 'custom'
        ? this.customPriorSds
        : [1.5, 1.5, 1.5, 1.5];
  }

  get sTreatment(): [number, number, number] {
    return [...this.contingencySuccesses] as [number, number, number];
  }

  get effectiveArmSizes(): [number, number, number, number] {
    return this.armSizes;
  }

  setContingencySuccesses(i: number, value: number) {
    const armSize = this.armSizes[i + 1];
    const clamped = Math.min(Math.max(0, value), armSize);
    this.contingencySuccesses[i] = clamped;
    this.contingencyFailures[i] = armSize - clamped;
  }

  setContingencyFailures(i: number, value: number) {
    const armSize = this.armSizes[i + 1];
    const clamped = Math.min(Math.max(0, value), armSize);
    this.contingencyFailures[i] = clamped;
    this.contingencySuccesses[i] = armSize - clamped;
  }

  setArmSize(i: number, value: number) {
    this.armSizes[i] = value;
    if (i > 0) {
      const ci = i - 1;
      if (this.contingencySuccesses[ci] > value) {
        this.contingencySuccesses[ci] = value;
        this.contingencyFailures[ci] = 0;
      } else {
        this.contingencyFailures[ci] = value - this.contingencySuccesses[ci];
      }
    }
  }

  get maxBaseline(): number {
    return Math.min(10, this.armSizes[0]);
  }

  // --- Results cache ---
  private _cachedKey = '';
  private _cachedResults: ScenarioResult[] = [];

  get results(): ScenarioResult[] {
    const key = JSON.stringify([
      [...this.armSizes],
      [...this.sTreatment],
      [...this.priorMeans],
      [...this.priorSds],
      this.maxBaseline,
      this.method
    ]);
    if (key === this._cachedKey) return this._cachedResults;
    this._cachedResults = runAllScenarios(
      this.armSizes,
      this.sTreatment,
      this.priorMeans,
      this.priorSds,
      this.maxBaseline,
      this.method === 'laplace' ? laplaceSample : mcmcSample
    );
    this._cachedKey = key;
    return this._cachedResults;
  }
}

export const appState = new AppState();
