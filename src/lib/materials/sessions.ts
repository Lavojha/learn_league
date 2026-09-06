import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { calculateSessionExpiry } from "@/lib/materials/access";

export async function createMaterialSession(userId: string, materialId: string, deviceId: string, material: { accessDurationMinutes: number; availableUntil?: Date | null }) {
  const active = await db
    .select({ id: materialAccessSessions.id })
    .from(materialAccessSessions)
    .where(and(eq(materialAccessSessions.userId, userId), eq(materialAccessSessions.status, "active")))
    .limit(1);

  if (active.length > 0) {
    throw new Error("You already have an active material session");
  }

  const startedAt = new Date();
  const expiresAt = calculateSessionExpiry(material, startedAt);
  if (!expiresAt || expiresAt <= startedAt) throw new Error("Material access has expired");

  const [session] = await db
    .insert(materialAccessSessions)
    .values({ userId, materialId, deviceId, startedAt, expiresAt, status: "active" })
    .returning();

  return session;
}

export async function endMaterialSession(userId: string, sessionId: string) {
  const [session] = await db
    .update(materialAccessSessions)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.userId, userId)))
    .returning();

  return session ?? null;
}
