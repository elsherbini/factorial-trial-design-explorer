<script lang="ts">
  import '../app.css';
  import About from '$lib/components/About.svelte';
  let { children } = $props();
  let activeTab = $state<'explorer' | 'about'>('explorer');
</script>

<div class="flex flex-col h-screen">
  <nav class="flex items-center gap-4 border-b bg-white px-4 py-2">
    <span class="text-lg font-bold">Trial Effect Size Explorer</span>
    <button
      class="text-sm px-3 py-1 rounded {activeTab === 'explorer' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}"
      onclick={() => (activeTab = 'explorer')}
    >Explorer</button>
    <button
      class="text-sm px-3 py-1 rounded {activeTab === 'about' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}"
      onclick={() => (activeTab = 'about')}
    >About</button>
  </nav>

  {#if activeTab === 'explorer'}
    {@render children()}
  {:else}
    <div class="flex-1 overflow-y-auto">
      <About />
    </div>
  {/if}
</div>
