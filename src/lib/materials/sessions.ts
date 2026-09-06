import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { calculateSessionExpiry } from "@/lib/materials/access";

export async function createMaterialSession(userId: string, materialId: string, deviceId: string, material: { accessDurationMinutes: number; availableUntil?: Date | null }) {
  const active = await db.select({ id: materialAccessSessions.id, deviceId: materialAccessSessions.deviceId }).from(materialAccessSessions).where(and(eq(materialAccessSessions.userId, userId), eq(materialAccessSessions.materialId, materialId), inArray(materialAccessSessions.status, ["active", "paused"]))).limit(1);
  if (active.length > 0) throw new Error(active[0].deviceId === deviceId ? "You already have an active material session" : "This material is already open on another device");

  const startedAt = new Date();
  const expiresAt = calculateSessionExpiry(material, startedAt);
  if (!expiresAt || expiresAt <= startedAt) throw new Error("Material access has expired");

  const [session] = await db.insert(materialAccessSessions).values({ userId, materialId, deviceId, startedAt, expiresAt, status: "active" }).returning();
  return session;
}

export async function getMaterialSession(userId: string, materialId: string, sessionId: string) {
  const [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.userId, userId), eq(materialAccessSessions.materialId, materialId))).limit(1);
  return session ?? null;
}

export async function endMaterialSession(userId: string, sessionId: string) {
  const [session] = await db.update(materialAccessSessions).set({ status: "ended", endedAt: new Date() }).where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.userId, userId))).returning();
  return session ?? null;
}
