import type { StoredMeltQuote } from '$lib/db/models/types.js';
import { MeltQuoteState } from '@cashu/cashu-ts';
import { get, writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';

const encryptionHelper = createEncryptionHelper<StoredMeltQuote>('encrypted-melt-quotes');

const createMeltQuotesStore = () => {
	const initialMeltQuotes: Array<StoredMeltQuote> = [];
	const store = writable<Array<StoredMeltQuote>>(initialMeltQuotes);
	const { set, subscribe, update } = store;
	const { addOrUpdate, remove, clear, init, reEncrypt, reset, getBy, getAllBy, addMany } =
		createDefaultStoreFunctions(encryptionHelper, store);

	const getActiveQuotes = () => {
		return get(store).filter((q) => q.state === MeltQuoteState.UNPAID && q.expiry > Date.now());
	};

	return {
		set,
		subscribe,
		update,
		addOrUpdate,
		remove,
		getActiveQuotes,
		init,
		reset,
		clear,
		reEncrypt,
		getBy,
		getAllBy,
		addMany
	};
};
export const meltQuotesStore = createMeltQuotesStore();
