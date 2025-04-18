import { writable } from 'svelte/store';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { createEncryptionHelper } from './helper/encryptionHelper.js';
import type { StoredPaymentRequest } from '$lib/db/models/types.js';

const encryptionHelper = createEncryptionHelper<StoredPaymentRequest>('encrypted-cashu-requests');

const createCashuRequestsStore = () => {
	const initialCashuRequests: Array<StoredPaymentRequest> = [];
	const store = writable<Array<StoredPaymentRequest>>(initialCashuRequests);
	const defaults = createDefaultStoreFunctions(encryptionHelper, store);

	return { ...store, ...defaults };
};
export const cashuRequestsStore = createCashuRequestsStore();
