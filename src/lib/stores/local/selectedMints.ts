import { BROWSER } from 'esm-env';
import { writable } from 'svelte/store';

const initialSelctedMint = -1;

const initialSelctedMintString: string = BROWSER?
	window.localStorage.getItem('selected-mint') ?? JSON.stringify(initialSelctedMint): "-1";

const initialValueSelected: number = JSON.parse(initialSelctedMintString);

export const selectedMint = writable<number>(initialValueSelected);

selectedMint.subscribe(async (value) => {
	const stringValue = JSON.stringify(value);
	window.localStorage.setItem('selected-mint', stringValue);
});