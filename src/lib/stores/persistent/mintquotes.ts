import type { StoredMintQuote } from '$lib/db/models/types.js';
import { MintQuoteState } from '@cashu/cashu-ts';
import { get, writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';
import { checkMintQuote, mintProofs, subrcibeToMintQuote } from '$lib/actions/actions.js';
import { settings } from './settings.js';

const encryptionHelper = createEncryptionHelper<StoredMintQuote>('encrypted-mint-quotes');

const createMintQuotesStore = () => {
	const initialMintQuotes: Array<StoredMintQuote> = [];
	const store = writable<Array<StoredMintQuote>>(initialMintQuotes);
	const defaults = createDefaultStoreFunctions(encryptionHelper, store);

	const getActiveQuotes = () => {
		return get(store).filter((q) => q.state === MintQuoteState.UNPAID);
	};

	const getReadyForIssueQuotes = () => {
		return get(store).filter((q) => q.state === MintQuoteState.PAID);
	};

	const init = async () => {
		await defaults.init()
		check()
	};

	const check = async () => {
		let s = undefined
		try {
			s = await settings.getSettings()
			await checkActiveQuotes();
			await mintPaidQuotes();
		}
		catch (e) {
			console.error(e)
			setTimeout(check, 1000 * 5);
			return
		}
		if (s?.general.useWS) {
			for (const q of [...getActiveQuotes(), ...getReadyForIssueQuotes()]) {
				subrcibeToMintQuote(q.mintUrl, q.quote)
			}
		}
		else {
			setTimeout(check, 1000 * 5);
		}
	}

	const checkActiveQuotes = async () => {
		const actives = getActiveQuotes();
		for (const quote of actives) {
			const checked = await checkMintQuote(quote);
			if (checked.state === 'PAID') {
				try {

					await mintProofs(checked);
				} catch (e) {
					console.error(e)
				}
			}
		}
	};
	const mintPaidQuotes = async () => {
		const readys = getReadyForIssueQuotes();
		for (const quote of readys) {
			await mintProofs(quote);
		}
	};

	return { ...store, ...defaults, getActiveQuotes, init };
};
export const mintQuotesStore = createMintQuotesStore();
