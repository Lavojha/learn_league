import { earlierDate } from "@/lib/utils/dates";

export function getEffectiveExpiry(sessionExpiresAt: Date, materialAvailableUntil?: Date | null) {
  return earlierDate(sessionExpiresAt, materialAvailableUntil);
}

export function isMaterialAvailable(now: Date, availableFrom?: Date | null, availableUntil?: Date | null) {
  if (availableFrom && now < availableFrom) return false;
  if (availableUntil && now >= availableUntil) return false;
  return true;
}
