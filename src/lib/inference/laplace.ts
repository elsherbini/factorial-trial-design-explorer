import { Matrix, CholeskyDecomposition } from 'ml-matrix';
import { logistic, buildDesignMatrix } from './logPosterior';
import type { InferenceInput, PosteriorSamples } from './types';

/**
 * IRLS for penalized logistic regression (MAP estimation).
 * Returns { beta: number[], vcov: number[][] }
 */
function irls(
  X: number[][],
  y: number[],
  priorMeans: number[],
  priorSds: number[],
  maxIter = 25,
  tol = 1e-8
): { beta: number[]; vcov: number[][] } {
  const n = X.length;
  const p = 4;
  const Xm = new Matrix(X);
  let beta = new Matrix([[0], [0], [0], [0]]);

  // Prior precision matrix (diagonal)
  const priorPrec = Matrix.zeros(p, p);
  for (let j = 0; j < p; j++) {
    priorPrec.set(j, j, 1 / (priorSds[j] * priorSds[j]));
  }
  const priorMu = Matrix.columnVector(priorMeans);

  for (let iter = 0; iter < maxIter; iter++) {
    const eta = Xm.mmul(beta);
    const mu = new Array(n);
    const w = new Array(n);
    for (let i = 0; i < n; i++) {
      mu[i] = logistic(eta.get(i, 0));
      w[i] = mu[i] * (1 - mu[i]) + 1e-10;
    }

    const z = new Matrix(n, 1);
    for (let i = 0; i < n; i++) {
      z.set(i, 0, eta.get(i, 0) + (y[i] - mu[i]) / w[i]);
    }

    const W = Matrix.zeros(n, n);
    for (let i = 0; i < n; i++) {
      W.set(i, i, w[i]);
    }

    const XtW = Xm.transpose().mmul(W);
    const H = XtW.mmul(Xm).add(priorPrec);
    const rhs = XtW.mmul(z).add(priorPrec.mmul(priorMu));

    const betaNew = new CholeskyDecomposition(H).solve(rhs);

    let maxDelta = 0;
    for (let j = 0; j < p; j++) {
      maxDelta = Math.max(maxDelta, Math.abs(betaNew.get(j, 0) - beta.get(j, 0)));
    }
    beta = betaNew;
    if (maxDelta < tol) break;
  }

  // Final covariance = H^{-1}
  const eta = Xm.mmul(beta);
  const w = new Array(n);
  for (let i = 0; i < n; i++) {
    const mu = logistic(eta.get(i, 0));
    w[i] = mu * (1 - mu) + 1e-10;
  }
  const W = Matrix.zeros(n, n);
  for (let i = 0; i < n; i++) {
    W.set(i, i, w[i]);
  }
  const H = Xm.transpose().mmul(W).mmul(Xm).add(priorPrec);
  const vcovRaw = new CholeskyDecomposition(H).solve(Matrix.eye(p));

  // Symmetrize to fix floating-point asymmetry
  const vcov = vcovRaw.add(vcovRaw.transpose()).mul(0.5);

  return {
    beta: Array.from({ length: p }, (_, j) => beta.get(j, 0)),
    vcov: vcov.to2DArray()
  };
}

/**
 * Sample from multivariate normal using Cholesky decomposition.
 */
function mvnormSample(mu: number[], sigma: number[][], nSamples: number): number[][] {
  const p = mu.length;
  const L = new CholeskyDecomposition(new Matrix(sigma)).lowerTriangularMatrix;

  const samples: number[][] = [];
  for (let s = 0; s < nSamples; s++) {
    const z: number[] = [];
    for (let j = 0; j < p; j++) {
      const u1 = Math.random();
      const u2 = Math.random();
      z.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    const row: number[] = new Array(p);
    for (let i = 0; i < p; i++) {
      row[i] = mu[i];
      for (let j = 0; j <= i; j++) {
        row[i] += L.get(i, j) * z[j];
      }
    }
    samples.push(row);
  }
  return samples;
}

/**
 * Run Laplace approximation and return posterior samples.
 */
export function laplaceSample(input: InferenceInput, nSamples = 4000): PosteriorSamples {
  const { X, y } = buildDesignMatrix(input.n, input.s);
  const { beta, vcov } = irls(X, y, [...input.priorMeans], [...input.priorSds]);
  const draws = mvnormSample(beta, vcov, nSamples);

  return {
    a: draws.map((d) => d[0]),
    b1: draws.map((d) => d[1]),
    b2: draws.map((d) => d[2]),
    b3: draws.map((d) => d[3])
  };
}
