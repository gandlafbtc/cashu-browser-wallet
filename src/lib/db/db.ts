import { openDB, deleteDB, type IDBPDatabase } from 'idb';
import type { NutstashDB } from './model.js';
import { ensureError } from '../helpers/errors.js';

export const DB_VERSION = 6;
export const DB_NAME = 'nutstash-db';

export class DB {
	private static _db: IDBPDatabase<NutstashDB> | undefined = undefined;

	static getInstance = async () => {
		if (this._db) {
			return this._db;
		}
		const database = await this.openDatabase();
		this._db = database;
		return this._db;
	};

	static async openDatabase() {
		const db = await openDB<NutstashDB>(DB_NAME, DB_VERSION, {
			upgrade: (db, oldVersion, newVersion, transaction, event) => {
				if (!oldVersion) {
					db.createObjectStore('encrypted-mints');
					db.createObjectStore('encrypted-settings');
					db.createObjectStore('encrypted-mint-quotes');
					db.createObjectStore('encrypted-melt-quotes');
					db.createObjectStore('encrypted-transactions');
					db.createObjectStore('encrypted-contacts');
					db.createObjectStore('encrypted-messages');
					db.createObjectStore('encrypted-counts');
					db.createObjectStore('encrypted-proofs');
					db.createObjectStore('encrypted-spent-proofs');
					db.createObjectStore('encrypted-pending-proofs');
					db.createObjectStore('encrypted-offline-proofs');
					db.createObjectStore('encrypted-keys');
					db.createObjectStore('encrypted-nwc-keys');
					db.createObjectStore('encrypted-mnemonics');
					db.createObjectStore('encrypted-relays');
				}
				// version 2
				if ((newVersion ?? 0) > 1 && oldVersion < 2) {
					db.createObjectStore('encrypted-cashu-requests');
					db.createObjectStore('encrypted-swaps');
				}

				// version 3
				if ((newVersion ?? 0) > 2 && oldVersion < 3) {
					db.createObjectStore('encrypted-offline-transactions');
				}
				// version 6
				if ((newVersion ?? 0) > 2 && oldVersion < 6) {
					db.createObjectStore('encrypted-multi-melt-quotes');
				}
				

			},
			blocked: (currentVersion, blockedVersion, event) => {
				// …
			},
			blocking: (currentVersion, blockedVersion, event) => {
				// …
			},
			terminated: () => {
				// …
			}
		});
		return db;
	}

	static async deleteDatabase() {
		try {
			await deleteDB(DB_NAME);
		} catch (error) {
			const err = ensureError(error);
			console.error(err);
		}
	}

	static async close() {
		throw new Error('Not implemented');
	}
}
