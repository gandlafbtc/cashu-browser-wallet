import { get, writable } from 'svelte/store';
import { createEncryptionHelper, type EncryptionHelper } from './helper/encryptionHelper.js';
import type { StoredSeed } from '$lib/db/models/types.js';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { mnemonicToSeed } from '@scure/bip39';

const encryptionHelper = createEncryptionHelper<StoredSeed>('encrypted-mnemonics');

export const createSeedStore = (encryptionHelper: EncryptionHelper<StoredSeed>) => {
	const store = writable<StoredSeed[]>([]);
	const defaults = createDefaultStoreFunctions(encryptionHelper, store);

	return {
		...store,
		...defaults
	};
};

export const seed = writable<Uint8Array>();

export const mnemonic = createSeedStore(encryptionHelper);

mnemonic.subscribe(async (value) => {
	if (value.length) {
		seed.set(await mnemonicToSeed(value[0].mnemonic));
	}
});
