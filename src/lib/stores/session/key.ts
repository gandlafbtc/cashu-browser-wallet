import { kdf } from '$lib/actions/encryption.js';
import { get, writable } from 'svelte/store';
import { DEFAULT_PASS } from '../static/pass.js';
import { usePassword } from '../local/usePassword.js';

export const createKeystore = () => {
	const store = writable<CryptoKey | undefined>();
	const { set, subscribe, update } = store;
	const init = async () => {
		let k: CryptoKey | undefined;
		if (!get(usePassword)) {
			k = await kdf(DEFAULT_PASS);
		}
		store.set(k);
	};
	return { set, subscribe, update, init };
};

export const key = createKeystore();
