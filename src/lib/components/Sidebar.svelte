<script lang="ts">
  import { appState } from '$lib/state.svelte';

  const armLabels = ['ABX alone', 'Standard + ABX', 'Treatment + ABX', 'Std + Trt + ABX'];
</script>

<aside class="w-96 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 space-y-4">
  <table class="w-full text-[10px] border-collapse border border-gray-300 mb-2">
    <thead>
      <tr>
        <th class="border border-gray-300 bg-gray-100 p-1"></th>
        <th class="border border-gray-300 bg-gray-100 p-1">No Standard Care</th>
        <th class="border border-gray-300 bg-gray-100 p-1">Standard Care</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th class="border border-gray-300 bg-gray-100 p-1 text-left">No Treatment</th>
        <td class="border border-gray-300 p-1 text-center">ABX alone</td>
        <td class="border border-gray-300 p-1 text-center">Standard + ABX</td>
      </tr>
      <tr>
        <th class="border border-gray-300 bg-gray-100 p-1 text-left">Treatment</th>
        <td class="border border-gray-300 p-1 text-center">Treatment + ABX</td>
        <td class="border border-gray-300 p-1 text-center">Std + Trt + ABX</td>
      </tr>
    </tbody>
  </table>
  <p class="text-xs text-gray-500 leading-relaxed">
    This tool fits a Bayesian logistic regression to this 2&times;2 factorial trial (standard care &times; treatment), letting you explore posterior effect sizes across different baseline success rates. See the <button class="underline text-blue-600 hover:text-blue-800" onclick={() => { const btn = document.querySelector('nav button:nth-child(3)') as HTMLElement; btn?.click(); }}>About</button> tab for model details.
  </p>

  <hr class="border-gray-300" />

  <h2 class="text-lg font-semibold">Set Observed Data</h2>
  <table class="w-full text-xs border-collapse">
    <thead>
      <tr class="border-b border-gray-300">
        <th class="text-left py-1 pr-1">Arm</th>
        <th class="py-1 px-1 text-center">n</th>
        <th class="py-1 px-1 text-center">Succ</th>
        <th class="py-1 px-1 text-center">Fail</th>
        <th class="py-1 px-1 text-center" colspan="3">Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-gray-100">
        <td class="py-1 pr-1 font-medium">
          ABX alone
          <span class="inline-block ml-0.5 cursor-help text-gray-400" title="Successes in this arm vary from 0 to n across the plots on the right">(i)</span>
        </td>
        <td class="py-1 px-1">
          <input type="number" min="1" value={appState.armSizes[0]}
            oninput={(e) => appState.setArmSize(0, Math.max(1, +e.currentTarget.value))}
            class="w-14 border rounded px-1 py-0.5 text-center text-xs" />
        </td>
        <td class="py-1 px-1 text-center text-gray-400" colspan="2">varies (0&ndash;{appState.armSizes[0]})</td>
        <td class="py-1 px-1 text-center text-gray-400" colspan="3">&mdash;</td>
      </tr>
      {#each armLabels.slice(1) as label, i}
        {@const n = appState.armSizes[i + 1]}
        {@const rate = n > 0 ? (appState.contingencySuccesses[i] / n * 100).toFixed(1) : '—'}
        <tr class="border-b border-gray-100">
          <td class="py-1 pr-1 font-medium">{label}</td>
          <td class="py-1 px-1">
            <input type="number" min="1" value={n}
              oninput={(e) => appState.setArmSize(i + 1, Math.max(1, +e.currentTarget.value))}
              class="w-14 border rounded px-1 py-0.5 text-center text-xs" />
          </td>
          <td class="py-1 px-1">
            <input type="number" min="0" max={n} value={appState.contingencySuccesses[i]}
              oninput={(e) => appState.setContingencySuccesses(i, +e.currentTarget.value)}
              class="w-14 border rounded px-1 py-0.5 text-center text-xs" />
          </td>
          <td class="py-1 px-1">
            <input type="number" min="0" max={n} value={appState.contingencyFailures[i]}
              oninput={(e) => appState.setContingencyFailures(i, +e.currentTarget.value)}
              class="w-14 border rounded px-1 py-0.5 text-center text-xs" />
          </td>
          <td class="py-1 pl-1">
            <button
              class="w-5 h-5 rounded border text-xs font-bold leading-none hover:bg-gray-100 disabled:opacity-30"
              disabled={appState.contingencySuccesses[i] <= 0}
              onclick={() => appState.setContingencySuccesses(i, appState.contingencySuccesses[i] - 1)}
            >&minus;</button>
          </td>
          <td class="py-1 text-center text-gray-500 tabular-nums">{rate}%</td>
          <td class="py-1 pr-1">
            <button
              class="w-5 h-5 rounded border text-xs font-bold leading-none hover:bg-gray-100 disabled:opacity-30"
              disabled={appState.contingencySuccesses[i] >= n}
              onclick={() => appState.setContingencySuccesses(i, appState.contingencySuccesses[i] + 1)}
            >+</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <hr class="border-gray-300" />

  <h2 class="text-lg font-semibold">Priors</h2>
  <fieldset class="space-y-1">
    {#each [['weakly', 'Weakly informative'], ['skeptical', 'Skeptical'], ['custom', 'Custom']] as [value, label]}
      <label class="flex items-center gap-2 text-sm">
        <input type="radio" name="prior" {value} checked={appState.priorPreset === value}
          onchange={() => (appState.priorPreset = value as 'weakly' | 'skeptical' | 'custom')} />
        {label}
      </label>
    {/each}
  </fieldset>

  {#if appState.priorPreset === 'custom'}
    <div class="space-y-2 pl-2 border-l-2 border-gray-300">
      <h3 class="text-sm font-medium">Prior means (log-odds)</h3>
      {#each ['Intercept', 'Standard care', 'Treatment', 'Interaction'] as label, i}
        <label class="block text-sm">
          {label}
          <input type="number" step="0.1" value={appState.customPriorMeans[i]}
            oninput={(e) => (appState.customPriorMeans[i] = +e.currentTarget.value)}
            class="w-full border rounded px-2 py-1 text-sm" />
        </label>
      {/each}
      <h3 class="text-sm font-medium">Prior SDs (log-odds)</h3>
      {#each ['Intercept SD', 'Standard care SD', 'Treatment SD', 'Interaction SD'] as label, i}
        <label class="block text-sm">
          {label}
          <input type="number" step="0.1" min="0.1" value={appState.customPriorSds[i]}
            oninput={(e) => (appState.customPriorSds[i] = +e.currentTarget.value)}
            class="w-full border rounded px-2 py-1 text-sm" />
        </label>
      {/each}
    </div>
  {/if}

  <hr class="border-gray-300" />

  <h2 class="text-lg font-semibold">Inference Method</h2>
  <fieldset class="space-y-1">
    {#each [['laplace', 'Laplace'], ['mcmc', 'MCMC']] as [value, label]}
      <label class="flex items-center gap-2 text-sm">
        <input type="radio" name="method" {value} checked={appState.method === value}
          onchange={() => (appState.method = value as 'laplace' | 'mcmc')} />
        {label}
      </label>
    {/each}
  </fieldset>
</aside>
