/**
 * Logistic (sigmoid) function.
 */
export function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Log of normal PDF (unnormalized — constant terms omitted).
 */
function logNormalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return -0.5 * z * z - Math.log(sd);
}

/**
 * Build the design matrix and response vector from arm sizes and successes.
 * Returns { X: number[][], y: number[] } where X has columns [1, std_care, treatment, std_care*treatment].
 */
export function buildDesignMatrix(
  n: [number, number, number, number],
  s: [number, number, number, number]
): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  const stdCare = [0, 1, 0, 1];
  const treatment = [0, 0, 1, 1];

  for (let arm = 0; arm < 4; arm++) {
    for (let i = 0; i < n[arm]; i++) {
      X.push([1, stdCare[arm], treatment[arm], stdCare[arm] * treatment[arm]]);
      y.push(i < s[arm] ? 1 : 0);
    }
  }
  return { X, y };
}

/**
 * Compute log-posterior for logistic regression with normal priors.
 * beta = [a, b1, b2, b3]
 */
export function logPosterior(
  beta: number[],
  X: number[][],
  y: number[],
  priorMeans: number[],
  priorSds: number[]
): number {
  let ll = 0;
  for (let i = 0; i < X.length; i++) {
    const eta = X[i][0] * beta[0] + X[i][1] * beta[1] + X[i][2] * beta[2] + X[i][3] * beta[3];
    const p = logistic(eta);
    ll += y[i] === 1 ? Math.log(p + 1e-15) : Math.log(1 - p + 1e-15);
  }

  let lp = 0;
  for (let j = 0; j < 4; j++) {
    lp += logNormalPdf(beta[j], priorMeans[j], priorSds[j]);
  }

  return ll + lp;
}
