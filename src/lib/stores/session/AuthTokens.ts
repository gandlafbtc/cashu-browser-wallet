import { writable } from "svelte/store";

export const authTokens: Map<string, Array<string>> = new Map();
export const clearAuthTokens: Map<string, string> = new Map();

export const authRequired = writable<[string, string]|null>()