export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isDateInRange(date: Date, from?: Date | null, until?: Date | null) {
  if (from && date < from) return false;
  if (until && date >= until) return false;
  return true;
}

export function earlierDate(...dates: Array<Date | null | undefined>) {
  const validDates = dates.filter((date): date is Date => date instanceof Date);
  if (validDates.length === 0) return null;
  return new Date(Math.min(...validDates.map((date) => date.getTime())));
}
