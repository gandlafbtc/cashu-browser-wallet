import type { KeysetCount } from '$lib/db/models/types.js';
import { get, writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';

const encryptionHelper = createEncryptionHelper<KeysetCount>('encrypted-counts');

const createCountsStore = () => {
	const initialCounts: Array<KeysetCount> = [];
	const store = writable<Array<KeysetCount>>(initialCounts);
	const { set, subscribe, update } = store;
	const { addOrUpdate, remove, clear, init, reEncrypt, reset, getBy, getAllBy } =
		createDefaultStoreFunctions(encryptionHelper, store);

	return {
		set,
		subscribe,
		update,
		addOrUpdate,
		remove,
		init,
		reset,
		clear,
		reEncrypt,
		getBy,
		getAllBy
	};
};
export const countsStore = createCountsStore();
