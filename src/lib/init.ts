import { get } from "svelte/store";
import { kdf } from "./actions/encryption.js";
import { usePassword } from "./stores/local/usePassword.js";
import { contactsStore } from "./stores/persistent/contacts.js";
import { countsStore } from "./stores/persistent/counts.js";
import { keysStore } from "./stores/persistent/keys.js";
import { meltQuotesStore } from "./stores/persistent/meltquotes.js";
import { messagesStore } from "./stores/persistent/message.js";
import { mintQuotesStore } from "./stores/persistent/mintquotes.js";
import { mints } from "./stores/persistent/mints.js";
import { mnemonic } from "./stores/persistent/mnemonic.js";
import { nwcKeysStore } from "./stores/persistent/nwcConnections.js";
import { offlineTransactionsStore } from "./stores/persistent/offlineTransactions.js";
import { offlineProofsStore, pendingProofsStore, proofsStore, spentProofsStore } from "./stores/persistent/proofs.js";
import { relaysStore } from "./stores/persistent/relays.js";
import { cashuRequestsStore } from "./stores/persistent/requests.js";
import { settings } from "./stores/persistent/settings.js";
import { swapsStore } from "./stores/persistent/swap.js";
import { transactionsStore } from "./stores/persistent/transactions.js";
import { key } from "./stores/session/key.js";
import { DEFAULT_PASS } from "./stores/static/pass.js";
import { BROWSER } from "esm-env";
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const stores = {
	mnemonic,
	mints,
	transactionsStore,
	offlineTransactionsStore,
	mintQuotesStore,
	meltQuotesStore,
	proofsStore,
	offlineProofsStore,
	pendingProofsStore,
	spentProofsStore,
	keysStore,
	nwcKeysStore,
    countsStore,
	messagesStore,
	contactsStore,
	relaysStore,
	cashuRequestsStore,
	swapsStore,
    settings
} as const;



const initStores = async () => {
	await Promise.all(Object.values(stores).map(store => store.init()));
};

export const init = async (pass?: string) => {
    if (!BROWSER) return
    if (get(usePassword)) {
        if (!pass) throw new Error("Password is required");
        key.set(await kdf(pass));
    } else {
        key.set(await kdf(DEFAULT_PASS));
    }
    //mnemonic must be created and initialized before any other stores are initialized because some other stores rely on it
    await mnemonic.init()
    if (!get(mnemonic).length) {
		const m = generateMnemonic(wordlist, 128);
		await mnemonic.reset();
		await mnemonic.add({ mnemonic: m });
    }
    await initStores();
};

export const reencrypt = async () => {
    if (!BROWSER) return
	await Promise.all(Object.values(stores).map(store => store.reEncrypt()));
};

export const setStoresFromBackupJSON = async (obj: any) => {
	(Object.keys(stores)).forEach(key => {
		stores[key].set(obj[key]);
	});
};