/**
 * Parses a date-only string (e.g. "2021-06-15") as local midnight.
 * `new Date("2021-06-15")` parses as UTC midnight per the ISO 8601 spec,
 * which then renders as the previous day for any timezone behind UTC.
 */
function parseDateOnly(dateStr: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return 'Unknown';
	return parseDateOnly(dateStr).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export function calculateAge(birthDate: string | undefined): string {
	if (!birthDate) return 'Unknown age';
	const birth = parseDateOnly(birthDate);
	const now = new Date();
	const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	if (years === 0) {
		const months = Math.floor((now.getTime() - birth.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
		return months <= 1 ? '< 1 month old' : `${months} months old`;
	}
	return years === 1 ? '1 year old' : `${years} years old`;
}

export function sortVisitsByDateDesc<T extends { date: string }>(visits: T[]): T[] {
	return [...visits].sort((a, b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime());
}
