import type { StoredMeltQuote } from '$lib/db/models/types.js';
import { MeltQuoteState } from '@cashu/cashu-ts';
import { get, writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';
import { checkMeltQuote, receiveEcash, subrcibeToMeltQuote } from '$lib/actions/actions.js';

const encryptionHelper = createEncryptionHelper<StoredMeltQuote>('encrypted-melt-quotes');

const createMeltQuotesStore = () => {
	const initialMeltQuotes: Array<StoredMeltQuote> = [];
	const store = writable<Array<StoredMeltQuote>>(initialMeltQuotes);
	const { set, subscribe, update } = store;
	const { addOrUpdate, remove, clear, init, reEncrypt, reset, getBy, getAllBy, addMany } =
		createDefaultStoreFunctions(encryptionHelper, store);

	const getActiveQuotes = () => {
		return get(store).filter((q) => q.state === MeltQuoteState.UNPAID || q.state === MeltQuoteState.PENDING);
	};

	const createCheckMeltQuotes = async () => {
		const actives = getActiveQuotes();
		for (const quote of actives) {
			const checked = await checkMeltQuote(quote);
			if (checked.state === 'UNPAID') {
				receiveEcash({mint: quote.mintUrl, proofs: quote.in})
			}
			if (checked.state === "PENDING") {
				subrcibeToMeltQuote(quote.mintUrl, quote.quote)
			}
			if (checked.state === 'PAID') {
				// mark as complete
			}
		}
	};
	createCheckMeltQuotes()

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
