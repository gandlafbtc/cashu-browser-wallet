import {
	CashuAuthMint,
	CashuAuthWallet,
	CashuMint,
	CashuWallet,
	getBlindedAuthToken,
	hasValidDleq,

} from '@cashu/cashu-ts';
import type { Proof, Token, Keys,
	MintActiveKeys,
	MintKeys } from '@cashu/cashu-ts';
import { bech32 } from 'bech32';
import { Buffer } from 'buffer';
import { get } from 'svelte/store';
import { seed } from '$lib/stores/persistent/mnemonic.js';
import type { Mint } from '$lib/db/models/types.js';
import { nip05, nip19 } from 'nostr-tools';
import { parseSecret } from '@cashu/crypto/modules/common/NUT11';
import { mints } from '$lib/stores/persistent/mints.js';
import { getBy, getByMany } from '$lib/stores/persistent/helper/storeHelper.js';
import { authRequired, authTokens, clearAuthTokens } from '$lib/stores/session/AuthTokens.js';
import { AuthRequiredError } from '$lib/helpers/errors.js';
// import { parseSecret } from '@cashu/crypto/modules/client/NUT11';
/**
 * returns a subset of tokens, so that not all tokens are sent to mint for smaller amounts.
 * @param amount
 * @param tokens
 * @returns
 */
export const getTokensToSend = (amount: number, tokens: Array<Proof>) => {
	let tokenAmount = 0;
	const tokenSubset = tokens.filter((token) => {
		if (tokenAmount < amount) {
			tokenAmount += token.amount;
			return true;
		}
	});
	return tokenSubset;
};

export const getLockedTokens = (proofs: Proof[]) => {
	return proofs.filter((p) => {
		try {
			// parseSecret(p.secret);
			return true;
		} catch (error) {
			return false;
		}
	});
};

export const getKeysForUnit = (keys: MintKeys[], unit = 'sat'): MintKeys | undefined => {
	return keys.find((k) => {
		return k.unit === unit;
	});
};
export const getKeysForKeysetId = (keys: MintKeys[], keysetId: string): MintKeys | undefined => {
	return keys.find((k) => {
		return k.id === keysetId;
	});
};

export const isPow2 = (number: number) => {
	return Math.log2(number) % 1 === 0;
};

export const isValidToken = (obj: any) => {
	// todo implement
	return true;
};

/**
 * removes a set of tokens from another set of tokens, and returns the remaining.
 * @param tokens
 * @param tokensToRemove
 * @returns
 */
export const getTokenSubset = (tokens: Array<Proof>, tokensToRemove: Array<Proof>) => {
	return tokens.filter((token) => !tokensToRemove.includes(token));
};

export const getAmountForTokenSet = (tokens: Array<Proof>): number => {
	return tokens.reduce((acc, t) => {
		return acc + t.amount;
	}, 0);
};

export const getUnitForKeysetId = (mints: Mint[], keysetId: string): string => {
	const unit = mints
		.map((m) => m.keysets.keysets)
		.flat()
		.find((ks) => ks.id === keysetId)?.unit;
	return unit ?? 'sat';
};

export const getMintForKeysetId = (mints: Mint[], keysetId: string): Mint | undefined => {
	return mints.find((m) => m.keysets.keysets.find((ks) => ks.id === keysetId));
};

export const getExactAmount = (
	amount: number,
	proofs: Proof[],
	includeFees?: boolean
): Proof[] | undefined => {
	const proofsClone = [...proofs];

	//todo how to calculate this
	if (includeFees) {
		amount = amount + 1;
	}
	const exactProofs: Proof[] = [];
	const sorted = proofsClone.sort((a, b) => b.amount - a.amount);

	while (getAmountForTokenSet(exactProofs) < amount) {
		const next = sorted.shift();
		if (!next) {
			break;
		}
		if (getAmountForTokenSet(exactProofs) + next.amount <= amount) {
			exactProofs.push(next);
		}
		if (getAmountForTokenSet(exactProofs) === amount) {
			return exactProofs;
		}
	}
	return undefined;
};

export const getAproxAmount = (
	amount: number,
	proofs: Proof[],
	includeFees?: boolean
): Proof[] | undefined => {
	const proofsClone = [...proofs];
	//todo how to calculate this
	if (includeFees) {
		amount = amount + 1;
	}

	const exactProofs: Proof[] = [];
	let lastClosest: Proof[] = [];

	for (let i = 0; i < 2; i++) {
		const sorted = proofsClone.sort((a, b) => b.amount - a.amount);
		while (getAmountForTokenSet(exactProofs) < amount) {
			const next = sorted.shift();
			if (!next) {
				break;
			}
			if (exactProofs.find((p) => p.secret === next.secret)) {
				continue;
			}

			if (getAmountForTokenSet(exactProofs) + next.amount <= amount) {
				exactProofs.push(next);
			} else {
				lastClosest = [next];
			}
			if (getAmountForTokenSet(exactProofs) === amount) {
				return exactProofs;
			}
		}
	}
	for (let i = 0; i < exactProofs.length; i++) {
		if (
			getAmountForTokenSet(exactProofs) +
				getAmountForTokenSet(lastClosest) -
				getAmountForTokenSet([exactProofs[i]]) >=
			amount
		) {
			// BUG? should this not be splice(i,1)
			exactProofs.splice(i);
			i--;
		}
	}

	if (amount > getAmountForTokenSet(exactProofs) + getAmountForTokenSet(lastClosest)) {
		return [];
	}
	return [...exactProofs, ...lastClosest];
};

export const getProofsOfMintUnit = (mint: Mint, proofs: Proof[], unit: string = 'sat'): Proof[] => {
	let keysetIds = mint.keysets.keysets.filter((k) => k.unit === unit).map((k) => k.id);
	const mintUnitProofs = getByMany(proofs, keysetIds, 'id');
	return mintUnitProofs;
};
export const getProofsOfMintsUnit = (
	mints: Mint[],
	proofs: Proof[],
	unit: string = 'sat'
): Proof[] => {
	let keysetIds = mints
		.map((m) => m.keysets.keysets)
		.flat()
		.filter((k) => k.unit === unit)
		.map((k) => k.id);
	const mintUnitProofs = getByMany(proofs, keysetIds, 'id');
	return mintUnitProofs;
};

export const getKeysetsOfTokens = (tokens: Array<Proof>) => {
	return removeDuplicatesFromArray(
		tokens.map((t) => {
			return t.id;
		})
	);
};

export const removeDuplicatesFromArray = <Type>(array: Array<Type>) => {
	return array.reduce((acc: Array<Type>, curr: Type) => {
		if (acc.includes(curr)) {
			return acc;
		} else {
			return [...acc, curr];
		}
	}, []);
};

export const formatAmount = (amount: number, unit?: string): string => {
	if (!unit) {
		unit = 'sat';
	}
	if (unit === 'sat') {
		return formatSats(amount);
	}
	if (unit === 'msat') {
		return formatMSats(amount);
	} else {
		return formatFiat(amount, unit);
	}
};

export const formatTime = (time: number): string => {
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(
		time
	);
};

const formatSats = (amount: number): string => {
	return '₿ ' + new Intl.NumberFormat('en-US').format(amount) + ' sat';
};

export const formatSecToMinStr = (seconds: number): string => {
	if (seconds <= 0) {
		return '00:00';
	}
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m.toString().padStart(0) + ':' + s.toString().padStart(2, '0');
};

const formatMSats = (amount: number): string => {
	return (
		'₿ ' +
		new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(
			amount / 1000
		) +
		' sat'
	);
};

export const getUnitSymbol = (unit: string, isLong = true): string => {
	switch (unit) {
		case 'sat':
			return '₿' + (isLong ? ' (sat)' : '');
		case 'msat':
			return '₿' + (isLong ? ' (msat)' : '');
		case 'btc':
			return '₿' + (isLong ? ' (btc)' : '');
		case 'usd':
			return '$' + (isLong ? ' (usd)' : '');
		case 'eur':
			return '€' + (isLong ? ' (eur)' : '');
		case 'gbp':
			return '£' + (isLong ? ' (gbp)' : '');
		case 'jpy':
			return '¥' + (isLong ? ' (jpy)' : '');
		case 'krw':
			return '₩' + (isLong ? ' (krw)' : '');
		default:
			return unit;
	}
};
const formatFiat = (amount: number, unit?: string): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		currency: unit?.toUpperCase()
	}).format(amount / 100);
};

export const getInvoiceFromAddress = async (
	address: string,
	amount: number
): Promise<{ pr: string; maxSendable: number; minSendable: number }> => {
	const addressParts = address.split('@');
	const endpoint = `https://${addressParts[1]}/.well-known/lnurlp/${addressParts[0]}`;
	return await LNURLLookup(endpoint, amount);
};

export const getInvoiceFromLNURL = async (
	LNURL: string,
	amount: number
): Promise<{ pr: string; maxSendable: number; minSendable: number }> => {
	const { prefix: hrp, words: dataPart } = bech32.decode(LNURL, 2000);
	const requestByteArray = bech32.fromWords(dataPart);

	const endpoint = Buffer.from(requestByteArray).toString();
	return await LNURLLookup(endpoint, amount);
};

const LNURLLookup = async (endpoint: string, amount: number) => {
	const { callback, maxSendable, minSendable } = (await (await fetch(endpoint)).json()) as {
		callback: string;
		maxSendable: number;
		minSendable: number;
	};
	if (!callback) {
		throw new Error('No callback url found.');
	}
	const cb = callback + (callback.includes('?') ? `&` : `?`) + `amount=${amount * 1000}`;
	const { pr } = (await (await fetch(cb)).json()) as { pr: string };
	return { pr, maxSendable, minSendable };
};

export const isNumeric = (value: unknown) => typeof value === 'number' || !isNaN(value);

export const getUnitsForMints = (mints: Mint[]): string[] => {
	if (!mints) {
		return ['sat'];
	}
	if (!mints.length) {
		return ['sat'];
	}
	const units = [
		...new Set(
			mints
				.map((m) => m?.keys.keysets)
				.flat()
				.map((k) => k?.unit)
		)
	];
	if (!units.length) {
		units.push('sat');
	}
	return units;
};



export const getWalletWithUnit = async (
	mints: Mint[],
	mintUrl: string,
	unit = 'sat'
): Promise<CashuWallet> => {
	const mint = getBy<Mint>(mints, mintUrl, 'url');
	if (!mint) {
		throw new Error(`Mint ${mintUrl} not found`);
	}
	const keysets = mint.keysets.keysets.filter((ks) => ks.unit === unit);
	const keys = mint.keys.keysets.find((ks) => ks.unit === unit);
	if (!keys) {
		throw new Error(`No keys for this unit: ${unit} [${mintUrl}]`);
	}


	const getAuthToken = async (): Promise<string> => {
		const authToken = authTokens.get(mintUrl)?.pop()
		if (authToken) {
			return authToken;
		}
		const maxMint = mint.info?.nuts[22]?.bat_max_mint
		if (maxMint) {
			const clearAuthToken = clearAuthTokens.get(mintUrl)
			if (!clearAuthToken) {
				authRequired.set([mintUrl, mint.info?.nuts[21].openid_discovery])
				throw new AuthRequiredError(`Requires auth for ${mintUrl}`, true,);
			}
			const newAuthTokens = await getBlindedAuthToken(Math.min(maxMint, 100), mint.url, )
			authTokens.set(mintUrl, newAuthTokens)
		}
		return '';
	}

	const wallet = new CashuWallet(new CashuMint(mintUrl, undefined, getAuthToken), {
		bip39seed: get(seed),
		mintInfo: mint.info,
		unit: unit,
		keys,
		keysets
	});
	await wallet.getKeys();
	return wallet;
};

export const checkValidPubkey = (pubkey: string) => {
	return /^[0-9a-f]{66}$/i.test(pubkey);
};

export const getConvertedPubKey = async (key: string) => {
	key = await resolveNip05(key);
	let nostrPubKey = key.startsWith('npub') ? (nip19.decode(key).data as string) : key;
	return nostrPubKey;
};

export const resolveNip05 = async (nostrAddr: string) => {
	if (!nostrAddr.includes('.')) {
		return nostrAddr;
	}
	const profile = await nip05.queryProfile(nostrAddr);
	if (profile?.pubkey) {
		return profile?.pubkey;
	} else {
		throw new Error('could not fetch nip-05');
	}
};

export const separateProofsById = (proofs: Proof[]): { id: string; proofs: Proof[] }[] => {
	const proofBuckets: { id: string; proofs: Proof[] }[] = [];
	for (const proof of proofs) {
		const proofBucket = proofBuckets.find((pb) => pb.id === proof.id);
		if (proofBucket) {
			proofBucket.proofs.push(proof);
		} else {
			proofBuckets.push({
				id: proof.id,
				proofs: [proof]
			});
		}
	}
	return proofBuckets;
};

export const parseSecrets = (token: Token) => {
	const pubs: string[] = [];
	let locktime: number = Infinity;
	let isKnownMint = false;
	let allDLEQsValid = false;
	let validDLEQsCount = 0;
	let mint = mints.getBy(token.mint, 'url');
	token?.proofs.forEach((t) => {
		//check secrets for lock
		try {
			const secret = parseSecret(t.secret);
			if (secret[0] === 'P2PK') {
				pubs.push(secret[1].data);
				//check for locktime
				for (const tag of secret[1].tags ?? []) {
					if (tag[0] === 'locktime') {
						let locktimeInt = Infinity;
						try {
							locktimeInt = parseInt(tag[1]);
						} catch (error) {
							//do nothing
						}
						if (!locktime || locktimeInt < locktime) {
							locktime = locktimeInt;
						}
					}
				}
			}

			if (!mint) {
				return;
			} else {
				isKnownMint = true;
			}

			const mintKeys = mint.keys.keysets;
			const mintKeysOfId = getKeysForKeysetId(mintKeys, t.id);

			if (!mintKeysOfId) {
				return;
			}
			if (hasValidDleq(t, mintKeysOfId)) {
				validDLEQsCount++;
			}
		} catch {
			// do nothing
		}
	});

	if (validDLEQsCount === token?.proofs.length) {
		allDLEQsValid = true;
	}
	// if no locktime has been set, set it to 0
	// if (locktime === Infinity) {
	// 	locktime = 0
	// }
	return { lockPubs: pubs, allDLEQsValid: allDLEQsValid, timelock: locktime, isKnownMint };
};
