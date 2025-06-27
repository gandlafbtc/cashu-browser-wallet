import type { MultiMeltQuote } from '$lib/db/models/types.js';
import { writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';

const encryptionHelper = createEncryptionHelper<MultiMeltQuote>('encrypted-multi-melt-quotes');

const createMultiMeltQuotesStore = () => {
	const initial: Array<MultiMeltQuote> = [];
	const store = writable<Array<MultiMeltQuote>>(initial);
	const defaults =
		createDefaultStoreFunctions(encryptionHelper, store);

	return {
		...store,
		...defaults
	};
};
export const multiMeltQuotesStore = createMultiMeltQuotesStore();
