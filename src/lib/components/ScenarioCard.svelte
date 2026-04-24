<script lang="ts">
  import type { ScenarioResult } from '$lib/inference/summarize';
  import { Chart, Axis, Area, Layer, Rule } from 'layerchart';
  import { appState } from '$lib/state.svelte';

  let { result }: { result: ScenarioResult } = $props();

  const baselinePct = $derived(
    appState.armSizes[0] > 0
      ? ((result.baselineSuccesses / appState.armSizes[0]) * 100).toFixed(0)
      : '?'
  );

  function formatNnt(c: { nntMedian: number | null; nntLo: number | null; nntHi: number | null; pSuperior: number }) {
    if (c.nntMedian === null || c.pSuperior < 0.5) return 'NNT: N/A';
    return `NNT [90% CI] ${c.nntMedian.toFixed(1)} [${c.nntLo!.toFixed(1)}, ${c.nntHi!.toFixed(1)}]`;
  }

  // Simple KDE (Epanechnikov kernel)
  function kde(samples: number[], bandwidth: number, nPoints = 100): { x: number; y: number }[] {
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const pad = (max - min) * 0.1;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < nPoints; i++) {
      const x = min - pad + ((max - min + 2 * pad) * i) / (nPoints - 1);
      let density = 0;
      for (const s of samples) {
        const u = (x - s) / bandwidth;
        if (Math.abs(u) <= 1) density += 0.75 * (1 - u * u);
      }
      density /= samples.length * bandwidth;
      points.push({ x, y: density });
    }
    return points;
  }

  const c1 = $derived(result.comparisons[0]);
  const c2 = $derived(result.comparisons[1]);

  const density1 = $derived.by(() => {
    if (!c1.arrSamples.length) return [];
    return kde(c1.arrSamples, 0.02);
  });

  const density2 = $derived.by(() => {
    if (!c2.arrSamples.length) return [];
    return kde(c2.arrSamples, 0.02);
  });

  const xDomain1 = $derived.by((): [number, number] => {
    if (!density1.length) return [-0.5, 0.5];
    const xs = density1.map((p) => p.x);
    return [Math.min(...xs), Math.max(...xs)];
  });

  const xDomain2 = $derived.by((): [number, number] => {
    if (!density2.length) return [-0.5, 0.5];
    const xs = density2.map((p) => p.x);
    return [Math.min(...xs), Math.max(...xs)];
  });

  const yDomain1 = $derived.by((): [number, number] => {
    if (!density1.length) return [0, 1];
    return [0, Math.max(...density1.map((p) => p.y)) * 1.1];
  });

  const yDomain2 = $derived.by((): [number, number] => {
    if (!density2.length) return [0, 1];
    return [0, Math.max(...density2.map((p) => p.y)) * 1.1];
  });
</script>

<div class="rounded-lg border bg-white p-4 shadow-sm">
  <h3 class="text-sm font-semibold mb-2">
    Baseline: {result.baselineSuccesses} {result.baselineSuccesses === 1 ? 'success' : 'successes'} ({baselinePct}%) in ABX arm
  </h3>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <div class="text-xs text-center mb-1">
        <div class="font-medium" style="color: #4e79a7">Trt vs ABX alone</div>
        <div>P(ARR&gt;0) = {(c1.pSuperior * 100).toFixed(1)}%</div>
        <div>{formatNnt(c1)}</div>
      </div>
      <div class="h-32">
        {#if density1.length > 0}
          <Chart
            x="x"
            y="y"
            xDomain={xDomain1}
            yDomain={yDomain1}
            yBaseline={0}
            padding={{ left: 35, bottom: 24, top: 4, right: 8 }}
          >
            <Layer>
              <Axis placement="left" tickSpacing={50} label="Density" />
              <Axis placement="bottom" label="Absolute Risk Reduction (ARR)" rule />
              <Rule x={0} stroke="#888" stroke-dasharray="4 3" stroke-width={1} />
              <Area data={density1} fill="rgba(78,121,167,0.3)" line={{ stroke: '#4e79a7', 'stroke-width': '2' }} />
            </Layer>
          </Chart>
        {/if}
      </div>
    </div>
    <div>
      <div class="text-xs text-center mb-1">
        <div class="font-medium" style="color: #e15759">Trt+Std vs Standard</div>
        <div>P(ARR&gt;0) = {(c2.pSuperior * 100).toFixed(1)}%</div>
        <div>{formatNnt(c2)}</div>
      </div>
      <div class="h-32">
        {#if density2.length > 0}
          <Chart
            x="x"
            y="y"
            xDomain={xDomain2}
            yDomain={yDomain2}
            yBaseline={0}
            padding={{ left: 35, bottom: 24, top: 4, right: 8 }}
          >
            <Layer>
              <Axis placement="left" tickSpacing={50} label="Density" />
              <Axis placement="bottom" label="Absolute Risk Reduction (ARR)" rule />
              <Rule x={0} stroke="#888" stroke-dasharray="4 3" stroke-width={1} />
              <Area data={density2} fill="rgba(225,87,89,0.3)" line={{ stroke: '#e15759', 'stroke-width': '2' }} />
            </Layer>
          </Chart>
        {/if}
      </div>
    </div>
  </div>
</div>
