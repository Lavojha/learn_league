export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isDateInRange(
  date: Date,
  from?: Date | null,
  until?: Date | null,
) {
  const afterStart = !from || date >= from;
  const beforeEnd = !until || date < until;
  return afterStart && beforeEnd;
}

export function earlierDate(...dates: Array<Date | null | undefined>) {
  const validDates = dates.filter((date): date is Date => date instanceof Date);
  if (validDates.length === 0) return null;
  return new Date(Math.min(...validDates.map((date) => date.getTime())));
}
