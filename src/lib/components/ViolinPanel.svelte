<script lang="ts">
  import type { ScenarioResult } from '$lib/inference/summarize';
  import { Chart, Axis, Violin, BoxPlot, Layer, Rule, Text } from 'layerchart';
  import { quantile, ascending } from 'd3-array';
  import { appState } from '$lib/state.svelte';

  let { results }: { results: ScenarioResult[] } = $props();

  function groupLabel(successes: number): string {
    const n = appState.effectiveArmSizes[0];
    const pct = n > 0 ? ((successes / n) * 100).toFixed(0) : '?';
    return `${successes} (${pct}%)`;
  }

  interface ViolinItem {
    group: string;
    samples: number[];
    pLabel: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  }

  function computeStats(samples: number[]): Pick<ViolinItem, 'min' | 'q1' | 'median' | 'q3' | 'max' | 'outliers'> {
    const sorted = Float64Array.from(samples).sort();
    const med = quantile(sorted, 0.5)!;
    return {
      min: quantile(sorted, 0.05)!,
      q1: med,
      median: med,
      q3: med,
      max: quantile(sorted, 0.95)!,
      outliers: []
    };
  }

  interface ViolinRow {
    label: string;
    color: string;
    violins: ViolinItem[];
    yDomain: [number, number];
    yLabel: string;
  }

  const rows = $derived.by((): ViolinRow[] => {
    const validResults = results.filter((r) => r.comparisons[0].arrSamples.length > 0);

    function computeYDomain(samples: number[][]): [number, number] {
      const all = samples.flat();
      if (!all.length) return [-1, 1];
      const min = Math.min(...all);
      const max = Math.max(...all);
      const pad = (max - min) * 0.1 || 0.1;
      return [min - pad, max + pad];
    }

    return [
      {
        label: 'Treatment+ABX\nvs ABX alone',
        color: '#4e79a7',
        violins: validResults.map((r) => ({
          group: groupLabel(r.baselineSuccesses),
          samples: r.comparisons[0].arrSamples,
          pLabel: `${(r.comparisons[0].pSuperior * 100).toFixed(0)}%`,
          pLabel_plotting: `P(ARR > 0) = ${(r.comparisons[0].pSuperior * 100).toFixed(0)}%`,
          ...computeStats(r.comparisons[0].arrSamples)
        })),
        yDomain: computeYDomain(validResults.map((r) => r.comparisons[0].arrSamples)),
        yLabel: 'Absolute Risk Reduction (ARR)'
      },
      {
        label: 'Std+Trt+ABX\nvs Standard+ABX',
        color: '#e15759',
        violins: validResults.map((r) => ({
          group: groupLabel(r.baselineSuccesses),
          samples: r.comparisons[1].arrSamples,
          pLabel: `${(r.comparisons[1].pSuperior * 100).toFixed(0)}%`,
          pLabel_plotting: `P(ARR > 0) = ${(r.comparisons[1].pSuperior * 100).toFixed(0)}%`,
          ...computeStats(r.comparisons[1].arrSamples)
        })),
        yDomain: computeYDomain(validResults.map((r) => r.comparisons[1].arrSamples)),
        yLabel: 'Absolute Risk Reduction (ARR)'
      },
      {
        label: 'Drug synergy\n(b3 posterior)',
        color: '#59a14f',
        violins: validResults.map((r) => ({
          group: groupLabel(r.baselineSuccesses),
          samples: r.comparisons[0].b3Samples,
          pLabel: `${(r.comparisons[0].pInteraction * 100).toFixed(0)}%`,
          pLabel_plotting: `P(b3 > 0) = ${(r.comparisons[0].pInteraction * 100).toFixed(0)}%`,
          ...computeStats(r.comparisons[0].b3Samples)
        })),
        yDomain: computeYDomain(validResults.map((r) => r.comparisons[0].b3Samples)),
        yLabel: 'b3 (interaction coefficient)'
      }
    ];
  });

  const maxBaselineSuccesses = $derived(
    results.length > 0 ? results[results.length - 1].baselineSuccesses : 10
  );
</script>

<div class="rounded-lg border bg-white p-4 shadow-sm">
  <h3 class="mb-4 text-sm font-semibold">
    Posteriors by Baseline Successes (0&ndash;{maxBaselineSuccesses})
  </h3>

  {#each rows as row, rowIdx}
    <div class="flex mb-2">
      <div
        class="w-28 shrink-0 flex items-center justify-end pr-3 text-xs text-right whitespace-pre-line bg-gray-50 rounded-l p-2"
      >
        {row.label}
      </div>
      <div class="flex-1 h-44">
        {#if row.violins.length > 0}
          <Chart
            data={row.violins}
            x="group"
            yDomain={row.yDomain}
            yNice
            bandPadding={0.3}
            padding={{
              left: 50,
              bottom: rowIdx === rows.length - 1 ? 28 : 4,
              top: 16,
              right: 10
            }}
          >
            <Layer>
              <Axis placement="left" grid tickSpacing={50} label={row.yLabel} />
              {#if rowIdx === rows.length - 1}
                <Axis placement="bottom" label="Successes in ABX-alone arm" />
              {/if}
              <Rule y={0} stroke="#888" stroke-dasharray="4 3" stroke-width={1} />
              <Text
                data={row.violins}
                x="group"
                y={2}
                value="pLabel_plotting"
                textAnchor="start"
                verticalAnchor="middle"
                class="text-[9px] fill-gray-500"
              />
              {#each row.violins as item}
                <Violin
                  data={item}
                  values="samples"
                  fill={row.color}
                  fillOpacity={0.3}
                  stroke={row.color}
                  strokeWidth={1}
                />
                <BoxPlot
                  data={item}
                  min="min"
                  q1="q1"
                  median="median"
                  q3="q3"
                  max="max"
                  outliers="outliers"
                  width={12}
                  fill="none"
                  stroke={row.color}
                  strokeWidth={1.5}
                />
              {/each}
            </Layer>
          </Chart>
        {/if}
      </div>
    </div>
  {/each}
</div>
