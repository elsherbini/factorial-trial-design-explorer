<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ScenarioCard from '$lib/components/ScenarioCard.svelte';
  import ViolinPanel from '$lib/components/ViolinPanel.svelte';
  import { appState } from '$lib/state.svelte';
</script>

<div class="flex flex-1 overflow-hidden">
  <Sidebar />
  <main class="flex-1 overflow-y-auto p-4 space-y-4">
    <div class="grid grid-cols-2 gap-4">
      {#each appState.results.slice(0, 4) as result}
        <ScenarioCard {result} />
      {/each}
    </div>
    <ViolinPanel results={appState.results} />
  </main>
</div>
