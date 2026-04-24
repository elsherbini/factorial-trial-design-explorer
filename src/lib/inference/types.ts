export interface InferenceInput {
  n: [number, number, number, number];
  s: [number, number, number, number];
  priorMeans: [number, number, number, number];
  priorSds: [number, number, number, number];
}

export interface PosteriorSamples {
  a: number[];
  b1: number[];
  b2: number[];
  b3: number[];
}

export type InferenceMethod = 'laplace' | 'mcmc';
