
import { get, writable } from 'svelte/store';
import { createEncryptionHelper } from './helper/encryptionHelper.js';
import type { Settings } from '$lib/db/models/types.js';
import { createDefaultStoreFunctions } from './helper/storeHelper.js';
import { BROWSER } from 'esm-env';

const initialValue = BROWSER? window.localStorage.getItem('nutstash.unit') ?? 'sat': 'sat';

export const unit = writable<string>(initialValue);

unit.subscribe((value) => {
	if (BROWSER) {
		window.localStorage.setItem('nutstash.unit', value);
	}
});

const DEFAULT_SETTINGS: Settings = {
	id: '0',
	contact: {},
	currency: {
		prefferedUnit: 'sat',
		useConversion: false,
		conversionUnit: 'USD'
	},
	keys: {},
	mints: {},
	nostr: {},
	tokens: {
		autoReceive: false
	},
	general: {
		hideBalance: false
	}
};

const encryptionHelper = createEncryptionHelper<Settings>('encrypted-settings');

const createSettingsStore = () => {
	const initialSettings: Array<Settings> = [];
	const store = writable<Array<Settings>>(initialSettings);
	const {
		addOrUpdate,
		clear,
		init: initialize,
		reEncrypt,
		reset
	} = createDefaultStoreFunctions(encryptionHelper, store);

	const addDefaultSettings = async () => {
		await addOrUpdate(DEFAULT_SETTINGS.id, DEFAULT_SETTINGS, 'id');
	};

	const init = async () => {
		await initialize();
		if (!get(store).length) {
			await addDefaultSettings();
		}
	};

	const setHideBalance = async (value: boolean) => {
		const s = get(store)[0];
		s.general.hideBalance = value;
		await addOrUpdate('0', s, 'id');
	};

	const setAutoReceive = async (value: boolean) => {
		const s = get(store)[0];
		s.tokens.autoReceive = value;
		await addOrUpdate('0', s, 'id');
	};

	const setUseConversion = async (value: boolean) => {
		const s = get(store)[0];
		s.currency.useConversion = value;
		await addOrUpdate('0', s, 'id');
	};
	const setConversionUnit = async (value: string) => {
		const s = get(store)[0];
		s.currency.conversionUnit = value;
		await addOrUpdate('0', s, 'id');
	};

	return { ...store, init, reset, clear, reEncrypt, setHideBalance, setAutoReceive, setUseConversion, setConversionUnit };
};
export const settings = createSettingsStore();
