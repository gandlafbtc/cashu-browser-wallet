import { settings } from "$lib/stores/persistent/settings.js";
import { get } from "svelte/store";

export let conversionUnits = [
  { name: "Argentine Peso", short: "ARS", symbol: "$", flag: "🇦🇷" },
  { name: "Australian Dollar", short: "AUD", symbol: "$", flag: "🇦🇺" },
  { name: "Brazilian Real", short: "BRL", symbol: "R$", flag: "🇧🇷" },
  { name: "Canadian Dollar", short: "CAD", symbol: "$", flag: "🇨🇦" },
  { name: "Swiss Franc", short: "CHF", symbol: "CHF", flag: "🇨🇭" },
  { name: "Chilean Peso", short: "CLP", symbol: "$", flag: "🇨🇱" },
  { name: "Chinese Yuan", short: "CNY", symbol: "¥", flag: "🇨🇳" },
  { name: "Czech Koruna", short: "CZK", symbol: "Kč", flag: "🇨🇿" },
  { name: "Danish Krone", short: "DKK", symbol: "kr", flag: "🇩🇰" },
  { name: "Euro", short: "EUR", symbol: "€", flag: "🇪🇺" },
  { name: "British Pound", short: "GBP", symbol: "£", flag: "🇬🇧" },
  { name: "Hong Kong Dollar", short: "HKD", symbol: "$", flag: "🇭🇰" },
  { name: "Croatian Kuna", short: "HRK", symbol: "kn", flag: "🇭🇷" },
  { name: "Hungarian Forint", short: "HUF", symbol: "Ft", flag: "🇭🇺" },
  { name: "Indian Rupee", short: "INR", symbol: "₹", flag: "🇮🇳" },
  { name: "Icelandic Króna", short: "ISK", symbol: "kr", flag: "🇮🇸" },
  { name: "Japanese Yen", short: "JPY", symbol: "¥", flag: "🇯🇵" },
  { name: "South Korean Won", short: "KRW", symbol: "₩", flag: "🇰🇷" },
  { name: "Nigerian Naira", short: "NGN", symbol: "₦", flag: "🇳🇬" },
  { name: "New Zealand Dollar", short: "NZD", symbol: "$", flag: "🇳🇿" },
  { name: "Polish Złoty", short: "PLN", symbol: "zł", flag: "🇵🇱" },
  { name: "Romanian Leu", short: "RON", symbol: "lei", flag: "🇷🇴" },
  { name: "Russian Ruble", short: "RUB", symbol: "₽", flag: "🇷🇺" },
  { name: "Swedish Krona", short: "SEK", symbol: "kr", flag: "🇸🇪" },
  { name: "Singapore Dollar", short: "SGD", symbol: "$", flag: "🇸🇬" },
  { name: "Thai Baht", short: "THB", symbol: "฿", flag: "🇹🇭" },
  { name: "Turkish Lira", short: "TRY", symbol: "₺", flag: "🇹🇷" },
  { name: "New Taiwan Dollar", short: "TWD", symbol: "NT$", flag: "🇹🇼" },
  { name: "US Dollar", short: "USD", symbol: "$", flag: "🇺🇸" }
]



let lastChecked = 0;
let lastResult = 0
let lastUnit = "";
const checkExpiry = 60 * 1000; // 1 hour in milliseconds

let rateNotFound = false;

export const getConversionRate = async () => {
    if (!get(settings)[0].currency.useConversion) {
        throw new Error("Currency conversion is not enabled. Please enable it in settings.");
    }
	if (lastChecked + checkExpiry > Date.now() && lastResult != null && lastUnit === get(settings)[0].currency.conversionUnit) {
		return lastResult;
	}
	switch (get(settings)[0].currency.conversionUnit) {
		case "KRW": {
			lastResult = await getKRW();
			break;
		}
		default: {
			lastResult = await getOther();
			break;
		}
	}
	lastChecked = Date.now();
	return lastResult;
};

const getKRW = async () => {
	const priceSource = "https://api.upbit.com";

	const response = await fetch(`${priceSource}/v1/ticker?markets=KRW-BTC`);

	if (!response.ok) {
		throw new Error("Failed to fetch conversion rate from upbit");
	}
	const data = await response.json();
	lastUnit = "KRW";
	
	return data[0].trade_price;
};

const getOther = async () => {
	if (rateNotFound) {
		return await getFallback()
	}
	const url = "https://blockchain.info/ticker?cors=true";
	const options = { method: "GET", headers: { accept: "application/json" } };
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error("Failed to fetch conversion rate from blockchain.info");
	}
	const data = await response.json();
	let currencyShort = get(settings)[0].currency.conversionUnit
	if (!currencyShort) {
		settings.setConversionUnit("USD")
		currencyShort = "USD"
	}
	const ticker = currencyShort.toUpperCase()
	const rate = data[ticker]?.last
	if (!rate) {
		rateNotFound = true
		return await getFallback()
	}
	lastUnit = ticker
	return Math.floor(rate)
};

const getFallback = async () => {
	const url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC"
	const options = { method: "GET", headers: { accept: "application/json" } };
	const response = await fetch(url, options);
	if (!response.ok) {
		throw new Error("Failed to fetch conversion rate from coinbase.com");
	}
	const data = await response.json();
	const currencyShort = get(settings)[0].currency.conversionUnit
	if (!currencyShort) {
		throw new Error("Failed to get currency short code from environment variable OPENPLEB_CURRENCY");
	}
	const ticker = currencyShort.toUpperCase()
	const rate = data.data.rates[ticker]
	if (!rate) {
		throw new Error(`Failed to find fallback conversion rate for ${ticker}`);
	}
	lastUnit = ticker
	return Math.floor(rate)
};
