import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions, materials } from "@/db/schema";
import { getEffectiveExpiry, isMaterialAvailable } from "@/lib/materials/expiry";
import { canViewMaterial } from "@/lib/materials/permissions";

export async function getMaterial(materialId: string) {
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  return material ?? null;
}

export async function canStartMaterialAccess(userId: string, materialId: string, now = new Date()) {
  const material = await getMaterial(materialId);
  if (!material || !(await canViewMaterial(userId, materialId))) return false;
  return isMaterialAvailable(now, material.availableFrom, material.availableUntil);
}

export async function getActiveMaterialSession(userId: string, materialId: string) {
  const [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.userId, userId), eq(materialAccessSessions.materialId, materialId), inArray(materialAccessSessions.status, ["active", "paused"]))).limit(1);
  return session ?? null;
}

export function calculateSessionExpiry(material: { accessDurationMinutes: number; availableUntil?: Date | null }, startedAt: Date) {
  const sessionExpiry = new Date(startedAt.getTime() + material.accessDurationMinutes * 60_000);
  return getEffectiveExpiry(sessionExpiry, material.availableUntil);
}
