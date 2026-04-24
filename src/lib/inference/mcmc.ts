// @ts-nocheck — bayes.js is untyped
import { mcmc, ld } from './vendor/index.js';
import { buildDesignMatrix, logistic } from './logPosterior';
import type { InferenceInput, PosteriorSamples } from './types';

/**
 * Run MCMC inference using bayes.js AmwgSampler.
 */
export function mcmcSample(
  input: InferenceInput,
  nSamples = 4000,
  burnIn = 1000
): PosteriorSamples {
  const { X, y } = buildDesignMatrix(input.n, input.s);

  const params = {
    a: { type: 'real' },
    b1: { type: 'real' },
    b2: { type: 'real' },
    b3: { type: 'real' }
  };

  const logPost = (state: Record<string, number>, data: { X: number[][]; y: number[] }) => {
    let result = 0;
    result += ld.norm(state.a, input.priorMeans[0], input.priorSds[0]);
    result += ld.norm(state.b1, input.priorMeans[1], input.priorSds[1]);
    result += ld.norm(state.b2, input.priorMeans[2], input.priorSds[2]);
    result += ld.norm(state.b3, input.priorMeans[3], input.priorSds[3]);
    for (let i = 0; i < data.X.length; i++) {
      const eta =
        state.a * data.X[i][0] +
        state.b1 * data.X[i][1] +
        state.b2 * data.X[i][2] +
        state.b3 * data.X[i][3];
      const p = logistic(eta);
      result += data.y[i] === 1 ? Math.log(p + 1e-15) : Math.log(1 - p + 1e-15);
    }
    return result;
  };

  const sampler = new mcmc.AmwgSampler(params, logPost, { X, y });
  sampler.burn(burnIn);
  const samples = sampler.sample(nSamples);

  return {
    a: samples.a,
    b1: samples.b1,
    b2: samples.b2,
    b3: samples.b3
  };
}
