<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ScenarioCard from '$lib/components/ScenarioCard.svelte';
  import ViolinPanel from '$lib/components/ViolinPanel.svelte';
  import PosteriorPanel from '$lib/components/PosteriorPanel.svelte';
  import { appState } from '$lib/state.svelte';
</script>

<div class="flex flex-1 overflow-hidden">
  <Sidebar />
  <main class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="rounded-lg border bg-white p-4 shadow-sm text-sm text-gray-700">
      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-2">
          <h3 class="font-semibold">Model</h3>
          <pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto">logit(p<sub>i</sub>) = a + b1 &times; std_care + b2 &times; treatment + b3 &times; (std_care &times; treatment)</pre>
          <table class="text-xs border-collapse w-full">
            <tbody>
              <tr><td class="pr-2 py-0.5 font-medium align-top">p1</td><td class="py-0.5">= logistic(a)</td><td class="pl-4 py-0.5 text-gray-500">ABX alone</td></tr>
              <tr><td class="pr-2 py-0.5 font-medium align-top">p2</td><td class="py-0.5">= logistic(a + b1)</td><td class="pl-4 py-0.5 text-gray-500">Standard + ABX</td></tr>
              <tr><td class="pr-2 py-0.5 font-medium align-top">p3</td><td class="py-0.5">= logistic(a + b2)</td><td class="pl-4 py-0.5 text-gray-500">Treatment + ABX</td></tr>
              <tr><td class="pr-2 py-0.5 font-medium align-top">p4</td><td class="py-0.5">= logistic(a + b1 + b2 + b3)</td><td class="pl-4 py-0.5 text-gray-500">Std + Trt + ABX</td></tr>
            </tbody>
          </table>
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold">Contrasts</h3>
          <table class="text-xs border-collapse w-full">
            <tbody>
              <tr>
                <td class="pr-2 py-1 font-medium align-top" style="color: #4e79a7">Treatment+ABX vs ABX alone</td>
                <td class="py-1">ARR = p3 &minus; p1</td>
              </tr>
              <tr>
                <td class="pr-2 py-1 font-medium align-top" style="color: #e15759">Std+Trt+ABX vs Standard+ABX</td>
                <td class="py-1">ARR = p4 &minus; p2</td>
              </tr>
              <tr>
                <td class="pr-2 py-1 font-medium align-top" style="color: #59a14f">Drug synergy</td>
                <td class="py-1">b3 &gt; 0 means the combination works better than the sum of parts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      {#each appState.results.slice(0, 4) as result}
        <ScenarioCard {result} />
      {/each}
    </div>
    <ViolinPanel results={appState.results} />

    <div class="rounded-lg border bg-white p-4 shadow-sm text-sm text-gray-700 space-y-3">
      <h3 class="font-semibold">How baseline success rate affects the estimates</h3>
      <p>
        As successes in the ABX-alone arm increase, the intercept (<em>a</em>) rises, which mechanically shrinks the estimated main effects <em>b1</em> and <em>b2</em> &mdash; the observed treatment-arm outcomes are fixed, so higher baseline success leaves less &ldquo;room&rdquo; for the individual treatment coefficients.
      </p>
      <p>This has three consequences visible in the plots above:</p>
      <ol class="list-decimal ml-6 space-y-2">
        <li>
          <strong>Treatment+ABX vs ABX alone is highly sensitive</strong> to the baseline rate. This comparison directly involves the control arm, so as baseline success rises, the gap between Treatment+ABX and ABX alone narrows and the ARR shrinks toward zero.
        </li>
        <li>
          <strong>Std+Trt+ABX vs Standard+ABX is less sensitive.</strong> Both arms in this comparison include standard care, so changes in the intercept shift both arms roughly equally, leaving their difference more stable.
        </li>
        <li>
          <strong>The synergy estimate (b3) tends to increase.</strong> Since <em>b1</em> and <em>b2</em> each shrink by roughly the same amount as <em>a</em> rises, but the combination arm&rsquo;s observed outcome is fixed, <em>b3</em> must grow to make up the difference. Concretely: logit(p&#8324;) = <em>a</em> + <em>b1</em> + <em>b2</em> + <em>b3</em> stays anchored to the data, so if <em>b1</em> and <em>b2</em> each drop by ~&Delta; while their sum with <em>b3</em> only drops by ~&Delta; total, then <em>b3</em> increases by ~&Delta;.
        </li>
      </ol>
    </div>

    <PosteriorPanel results={appState.results} />
  </main>
</div>
