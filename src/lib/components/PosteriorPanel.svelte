<script lang="ts">
  import type { ScenarioResult } from '$lib/inference/summarize';
  import type { PosteriorSamples } from '$lib/inference/types';
  import { appState } from '$lib/state.svelte';

  let { results }: { results: ScenarioResult[] } = $props();

  let selectedBaseline = $state(0);

  const maxBaseline = $derived(results.length > 0 ? results.length - 1 : 0);
  const clampedBaseline = $derived(Math.min(selectedBaseline, maxBaseline));

  const samples = $derived(
    results.length > 0 ? results[clampedBaseline].posteriorSamples : null
  );

  const paramNames = ['a', 'b1', 'b2', 'b3'] as const;
  const paramLabels = ['a (intercept)', 'b1 (std care)', 'b2 (treatment)', 'b3 (interaction)'];

  function quantileSorted(sorted: Float64Array, q: number): number {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  interface ParamStats {
    median: number;
    lo: number;
    hi: number;
    samples: number[];
  }

  const paramStats = $derived.by((): ParamStats[] => {
    if (!samples) return [];
    return paramNames.map((name) => {
      const raw = samples[name];
      const sorted = Float64Array.from(raw).sort();
      return {
        median: quantileSorted(sorted, 0.5),
        lo: quantileSorted(sorted, 0.05),
        hi: quantileSorted(sorted, 0.95),
        samples: raw
      };
    });
  });

  // Prior stats from Normal(mean, sd) — analytic quantiles
  const priorStats = $derived.by((): ParamStats[] => {
    const means = appState.priorMeans;
    const sds = appState.priorSds;
    return paramNames.map((_, i) => ({
      median: means[i],
      lo: means[i] - 1.645 * sds[i],  // 5th percentile
      hi: means[i] + 1.645 * sds[i],   // 95th percentile
      samples: []
    }));
  });

  // Forest plot dimensions
  const forestW = 400;
  const forestH = 160;
  const forestPadLeft = 140;
  const forestPadRight = 20;
  const forestPadTop = 10;
  const forestPadBottom = 25;
  const forestInnerW = forestW - forestPadLeft - forestPadRight;
  const forestRowH = (forestH - forestPadTop - forestPadBottom) / 4;

  // Shared x domain across prior and posterior
  const sharedForestXDomain = $derived.by((): [number, number] => {
    const allStats = [...paramStats, ...priorStats];
    if (!allStats.length) return [-3, 3];
    const allLo = Math.min(...allStats.map((s) => s.lo));
    const allHi = Math.max(...allStats.map((s) => s.hi));
    const pad = (allHi - allLo) * 0.15 || 0.5;
    return [Math.min(allLo - pad, -0.1), Math.max(allHi + pad, 0.1)];
  });

  function forestX(v: number): number {
    const [lo, hi] = sharedForestXDomain;
    return forestPadLeft + ((v - lo) / (hi - lo)) * forestInnerW;
  }

  function forestY(i: number): number {
    return forestPadTop + (i + 0.5) * forestRowH;
  }

  function forestTicks(): number[] {
    const [lo, hi] = sharedForestXDomain;
    return Array.from({ length: 7 }, (_, i) => lo + ((hi - lo) * i) / 6);
  }

  // Corner plot
  const cornerCellSize = 120;
  const cornerPad = 20;
  const cornerLabelW = 50;
  const cornerLabelH = 40;

  const scatterN = 500;
  const subsampled = $derived.by((): number[][] => {
    if (!samples) return [];
    const n = samples.a.length;
    const step = Math.max(1, Math.floor(n / scatterN));
    return paramNames.map((name) => {
      const arr: number[] = [];
      for (let i = 0; i < n; i += step) arr.push(samples[name][i]);
      return arr;
    });
  });

  const cornerDomains = $derived.by((): [number, number][] => {
    if (!paramStats.length) return paramNames.map(() => [-3, 3] as [number, number]);
    return paramStats.map((s) => {
      const pad = (s.hi - s.lo) * 0.2 || 0.5;
      return [s.lo - pad, s.hi + pad] as [number, number];
    });
  });

  function kde(data: number[], domain: [number, number], nPoints = 80): { x: number; y: number }[] {
    const [dMin, dMax] = domain;
    const bandwidth = (dMax - dMin) / 20;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < nPoints; i++) {
      const x = dMin + ((dMax - dMin) * i) / (nPoints - 1);
      let density = 0;
      for (const s of data) {
        const u = (x - s) / bandwidth;
        if (Math.abs(u) <= 1) density += 0.75 * (1 - u * u);
      }
      density /= data.length * bandwidth;
      points.push({ x, y: density });
    }
    return points;
  }

  function scaledPath(
    pts: { x: number; y: number }[],
    xDomain: [number, number],
    w: number,
    h: number
  ): string {
    const maxY = Math.max(...pts.map((p) => p.y));
    if (maxY === 0) return '';
    return pts
      .map((p, i) => {
        const sx = cornerPad + ((p.x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (w - 2 * cornerPad);
        const sy = h - cornerPad - (p.y / maxY) * (h - 2 * cornerPad);
        return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
      })
      .join(' ');
  }

  function filledPath(
    pts: { x: number; y: number }[],
    xDomain: [number, number],
    w: number,
    h: number
  ): string {
    const maxY = Math.max(...pts.map((p) => p.y));
    if (maxY === 0) return '';
    const baseline = h - cornerPad;
    const coords = pts.map((p) => {
      const sx = cornerPad + ((p.x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (w - 2 * cornerPad);
      const sy = h - cornerPad - (p.y / maxY) * (h - 2 * cornerPad);
      return [sx, sy];
    });
    const first = coords[0];
    const last = coords[coords.length - 1];
    let d = `M${first[0].toFixed(1)},${baseline}`;
    for (const [sx, sy] of coords) d += ` L${sx.toFixed(1)},${sy.toFixed(1)}`;
    d += ` L${last[0].toFixed(1)},${baseline} Z`;
    return d;
  }
</script>

<div class="space-y-4">
  <div class="flex items-center gap-3">
    <h3 class="text-sm font-semibold">Parameter Distributions</h3>
    <label class="text-xs text-gray-600 flex items-center gap-1.5">
      Successes in ABX-alone arm:
      <select
        class="border rounded px-1.5 py-0.5 text-xs"
        bind:value={selectedBaseline}
      >
        {#each Array.from({ length: maxBaseline + 1 }, (_, i) => i) as val}
          <option value={val}>{val}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if samples && paramStats.length > 0}
    <!-- Forest plots side by side -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Prior forest plot -->
      <div class="rounded-lg border bg-white p-4 shadow-sm">
        <h4 class="text-xs font-medium text-gray-500 mb-1">Prior (median + 90% CI)</h4>
        <svg viewBox="0 0 {forestW} {forestH}" class="w-full">
          <line
            x1={forestX(0)} x2={forestX(0)}
            y1={forestPadTop} y2={forestH - forestPadBottom}
            stroke="#888" stroke-dasharray="4 3" stroke-width="1"
          />
          <line
            x1={forestPadLeft} x2={forestW - forestPadRight}
            y1={forestH - forestPadBottom} y2={forestH - forestPadBottom}
            stroke="#ccc" stroke-width="1"
          />
          {#each forestTicks() as tick}
            <line
              x1={forestX(tick)} x2={forestX(tick)}
              y1={forestH - forestPadBottom} y2={forestH - forestPadBottom + 4}
              stroke="#999" stroke-width="1"
            />
            <text
              x={forestX(tick)} y={forestH - forestPadBottom + 15}
              text-anchor="middle" class="text-[9px] fill-gray-500"
            >{tick.toFixed(1)}</text>
          {/each}
          {#each priorStats as stat, i}
            <text
              x={forestPadLeft - 8} y={forestY(i) + 4}
              text-anchor="end" class="text-[11px] fill-gray-700 font-medium"
            >{paramLabels[i]}</text>
            <line
              x1={forestX(stat.lo)} x2={forestX(stat.hi)}
              y1={forestY(i)} y2={forestY(i)}
              stroke="#999" stroke-width="2"
            />
            <line
              x1={forestX(stat.lo)} x2={forestX(stat.lo)}
              y1={forestY(i) - 4} y2={forestY(i) + 4}
              stroke="#999" stroke-width="1.5"
            />
            <line
              x1={forestX(stat.hi)} x2={forestX(stat.hi)}
              y1={forestY(i) - 4} y2={forestY(i) + 4}
              stroke="#999" stroke-width="1.5"
            />
            <circle
              cx={forestX(stat.median)} cy={forestY(i)}
              r="4" fill="#999"
            />
          {/each}
        </svg>
      </div>

      <!-- Posterior forest plot -->
      <div class="rounded-lg border bg-white p-4 shadow-sm">
        <h4 class="text-xs font-medium text-gray-500 mb-1">Posterior (median + 90% CI)</h4>
        <svg viewBox="0 0 {forestW} {forestH}" class="w-full">
          <line
            x1={forestX(0)} x2={forestX(0)}
            y1={forestPadTop} y2={forestH - forestPadBottom}
            stroke="#888" stroke-dasharray="4 3" stroke-width="1"
          />
          <line
            x1={forestPadLeft} x2={forestW - forestPadRight}
            y1={forestH - forestPadBottom} y2={forestH - forestPadBottom}
            stroke="#ccc" stroke-width="1"
          />
          {#each forestTicks() as tick}
            <line
              x1={forestX(tick)} x2={forestX(tick)}
              y1={forestH - forestPadBottom} y2={forestH - forestPadBottom + 4}
              stroke="#999" stroke-width="1"
            />
            <text
              x={forestX(tick)} y={forestH - forestPadBottom + 15}
              text-anchor="middle" class="text-[9px] fill-gray-500"
            >{tick.toFixed(1)}</text>
          {/each}
          {#each paramStats as stat, i}
            <text
              x={forestPadLeft - 8} y={forestY(i) + 4}
              text-anchor="end" class="text-[11px] fill-gray-700 font-medium"
            >{paramLabels[i]}</text>
            <line
              x1={forestX(stat.lo)} x2={forestX(stat.hi)}
              y1={forestY(i)} y2={forestY(i)}
              stroke="#4e79a7" stroke-width="2"
            />
            <line
              x1={forestX(stat.lo)} x2={forestX(stat.lo)}
              y1={forestY(i) - 4} y2={forestY(i) + 4}
              stroke="#4e79a7" stroke-width="1.5"
            />
            <line
              x1={forestX(stat.hi)} x2={forestX(stat.hi)}
              y1={forestY(i) - 4} y2={forestY(i) + 4}
              stroke="#4e79a7" stroke-width="1.5"
            />
            <circle
              cx={forestX(stat.median)} cy={forestY(i)}
              r="4" fill="#4e79a7"
            />
          {/each}
        </svg>
      </div>
    </div>

    <!-- Corner Plot + Explainer side by side -->
    <div class="grid grid-cols-[1fr_auto] gap-4">
      <div class="rounded-lg border bg-white p-4 shadow-sm text-sm text-gray-700 space-y-3">
        <h4 class="font-semibold">Understanding the parameter correlations</h4>
        <p>
          The parameters a, b1, b2, and b3 are jointly estimated from the same data, so their posteriors are strongly correlated. Most notably, a (the intercept) is negatively correlated with b1 and b2 &mdash; if the model estimates a higher baseline rate, the treatment effects must shrink to match the observed outcomes in each arm.
        </p>
        <p>
          This is why <strong>Absolute Risk Reduction (ARR) is more interpretable than individual parameter estimates.</strong> When computing ARR = p3 &minus; p1, each posterior draw uses the correlated values of a and b2 together, so the correlations cancel out. The resulting ARR distribution is often much tighter than the marginal distribution of b2 alone would suggest.
        </p>
        <h4 class="font-semibold">A note on synergy (b3)</h4>
        <p>
          The interaction coefficient b3 measures departure from additivity on the <strong>log-odds scale</strong>. This is a clean, well-defined quantity: b3 = 0 means the log-odds effects of standard care and treatment simply add. However, because the logistic function is nonlinear, additivity on the log-odds scale does <em>not</em> imply additivity on the probability scale. Two treatments with b3 = 0 can still appear sub-additive in absolute risk terms when baseline rates are high (ceiling effects) or super-additive when baseline rates are low. The b3 posterior answers a precise question &mdash; &ldquo;do these treatments interact on the log-odds scale?&rdquo; &mdash; but translating that to probability-scale intuitions requires care.
        </p>
      </div>

      <div class="rounded-lg border bg-white p-4 shadow-sm">
        <h4 class="text-xs font-medium text-gray-500 mb-1">Pairwise posterior correlations</h4>
        <div
          class="inline-grid"
          style="grid-template-columns: {cornerLabelW}px repeat(4, {cornerCellSize}px); grid-template-rows: repeat(4, {cornerCellSize}px) {cornerLabelH}px;"
        >
          {#each paramNames as _, row}
            <div class="flex items-center justify-end pr-2 text-[10px] text-gray-600 font-medium">
              {paramLabels[row]}
            </div>
            {#each paramNames as _, col}
              {#if row === col}
                {@const pts = kde(subsampled[row], cornerDomains[row])}
                <div class="border border-gray-200">
                  <svg viewBox="0 0 {cornerCellSize} {cornerCellSize}" width={cornerCellSize} height={cornerCellSize}>
                    <path d={filledPath(pts, cornerDomains[row], cornerCellSize, cornerCellSize)} fill="rgba(78,121,167,0.2)" />
                    <path d={scaledPath(pts, cornerDomains[row], cornerCellSize, cornerCellSize)} fill="none" stroke="#4e79a7" stroke-width="1.5" />
                  </svg>
                </div>
              {:else if row > col}
                {@const xDom = cornerDomains[col]}
                {@const yDom = cornerDomains[row]}
                <div class="border border-gray-200">
                  <svg viewBox="0 0 {cornerCellSize} {cornerCellSize}" width={cornerCellSize} height={cornerCellSize}>
                    {#each subsampled[col] as _, k}
                      {@const sx = cornerPad + ((subsampled[col][k] - xDom[0]) / (xDom[1] - xDom[0])) * (cornerCellSize - 2 * cornerPad)}
                      {@const sy = cornerCellSize - cornerPad - ((subsampled[row][k] - yDom[0]) / (yDom[1] - yDom[0])) * (cornerCellSize - 2 * cornerPad)}
                      <circle cx={sx} cy={sy} r="1.2" fill="#4e79a7" opacity="0.15" />
                    {/each}
                  </svg>
                </div>
              {:else}
                <div></div>
              {/if}
            {/each}
          {/each}
          <div></div>
          {#each paramLabels as label}
            <div class="flex items-start justify-center pt-1 text-[10px] text-gray-600 font-medium text-center">
              {label}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
