import { ContextError, ensureError } from '$lib/helpers/errors.js';
import { CashuMint, type MintActiveKeys } from '@cashu/cashu-ts';

import { get, writable } from 'svelte/store';
import type { Mint } from '$lib/db/models/types.js';
import { createEncryptionHelper, type EncryptionHelper } from './helper/encryptionHelper.js';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { getHostFromUrl } from '$lib/util/utils.js';

const encryptionHelper = createEncryptionHelper<Mint>('encrypted-mints');

export const createMintsStore = (encryptionHelper: EncryptionHelper<Mint>) => {
	const store = writable<Mint[]>([]);
	const defaults = createDefaultStoreFunctions(encryptionHelper, store);

	const fetchMint = async (url: string) => {
		const mint = await loadMint(url);
		defaults.addOrUpdate(url, mint, 'url');
	};

	const makeDefaultMint = async (mint: Mint) => {
		await defaults.remove(mint.url, 'url');
		await defaults.addOrUpdate(mint.url, mint, 'url');
	};

	const getByHost = (host: string): Mint | undefined => {
		return get(store).find((m) => host === getHostFromUrl(m.url));
	};

	return {
		...store,
		...defaults,
		fetchMint,
		getByHost,
		makeDefaultMint
	};
};

export const mints = createMintsStore(encryptionHelper);

const loadMint = async (mintUrl: string): Promise<Mint> => {
	try {
		const cashuMint = new CashuMint(mintUrl);
		const mintInfo = await cashuMint.getInfo();
		const mintAllKeysets = await cashuMint.getKeySets();
		const mintActiveKeys: MintActiveKeys = await cashuMint.getKeys();
		const mint = {
			info: mintInfo,
			keys: mintActiveKeys,
			keysets: mintAllKeysets,
			url: mintUrl
		};

		return mint;
	} catch (error) {
		const err = ensureError(error);
		throw new ContextError(`Could not load mint`, {
			cause: err,
			context: {
				url: mintUrl
			}
		});
	}
};
