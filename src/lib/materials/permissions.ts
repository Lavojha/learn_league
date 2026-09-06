import { eq } from "drizzle-orm";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { getGroupMembership } from "@/lib/groups/membership";
import { hasGroupPermission } from "@/lib/groups/permissions";

export async function canManageMaterial(userId: string, materialId: string) {
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  if (!material) return false;

  return hasGroupPermission(userId, material.groupId, "manageMaterials");
}

export async function canViewMaterial(userId: string, materialId: string) {
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  if (!material || material.status !== "published") return false;

  if (material.visibility === "public") return true;
  return (await getGroupMembership(userId, material.groupId)) !== null;
}
