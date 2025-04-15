import { writable } from 'svelte/store';

import { SimplePool } from 'nostr-tools';

const nostrPool = writable<SimplePool>(new SimplePool());

export { nostrPool };
