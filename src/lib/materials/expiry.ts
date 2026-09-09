import { earlierDate } from "@/lib/utils/dates";

export function getEffectiveExpiry(
  sessionExpiresAt: Date,
  materialAvailableUntil?: Date | null,
) {
  return earlierDate(sessionExpiresAt, materialAvailableUntil);
}

export function isMaterialAvailable(
  now: Date,
  availableFrom?: Date | null,
  availableUntil?: Date | null,
) {
  const hasStarted = !availableFrom || now >= availableFrom;
  const hasNotEnded = !availableUntil || now < availableUntil;
  return hasStarted && hasNotEnded;
}
