<script>
    import { countsStore } from "$lib/index.js";
	import { init } from "$lib/init.js";
	import { mints } from "$lib/stores/persistent/mints.js";
	import { mnemonic, seed } from "$lib/stores/persistent/mnemonic.js";
	import { onMount } from "svelte";



    onMount(async() => {
        await init()
    })

    const fetchMint = async () => {
        mints.fetchMint("https://testnut.cashu.space")
    }

        </script>
<h1>Welcome to your library project</h1>
<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<button onclick={fetchMint}>
    addMint
</button>
{#each $mints as item}
  
{item.url}
{/each}
