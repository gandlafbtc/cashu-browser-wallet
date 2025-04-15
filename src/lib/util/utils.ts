export const getHostFromUrl = (url: string) => {
	return url?.split(':')[1].split('/').join('');
};

export const getCount = (from: number, to: number): number[] => {
	const count = [];
	for (let i = from; i <= to; i++) {
		count.push(i);
	}
	return count;
};