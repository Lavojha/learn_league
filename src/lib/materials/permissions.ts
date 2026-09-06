import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, materials } from "@/db/schema";
import { getGroupMembership } from "@/lib/groups/membership";
import { hasGroupPermission } from "@/lib/groups/permissions";

export async function canManageMaterial(userId: string, materialId: string) {
  const [material] = await db.select({ groupId: materials.groupId, status: materials.status }).from(materials).where(eq(materials.id, materialId)).limit(1);
  if (!material || material.status !== "published") return false;
  const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, material.groupId)).limit(1);
  if (!group || group.status !== "active") return false;
  return hasGroupPermission(userId, material.groupId, "manageMaterials");
}

export async function canViewMaterial(userId: string, materialId: string) {
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  if (!material || material.status !== "published") return false;

  const [group] = await db
    .select({ type: groups.type, visibility: groups.visibility, status: groups.status })
    .from(groups)
    .where(eq(groups.id, material.groupId))
    .limit(1);
  if (!group || group.status !== "active") return false;

  if (material.visibility === "public") {
    return group.type === "public" && group.visibility === "discoverable";
  }

  return (await getGroupMembership(userId, material.groupId)) !== null;
}
