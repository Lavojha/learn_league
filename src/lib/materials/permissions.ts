import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, materials } from "@/db/schema";
import { getGroupMembership } from "@/lib/groups/membership";
import { hasGroupPermission } from "@/lib/groups/permissions";

async function getPublishedMaterial(materialId: string) {
  const [material] = await db
    .select({ id: materials.id, groupId: materials.groupId, status: materials.status, visibility: materials.visibility })
    .from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.status, "published")))
    .limit(1);
  return material ?? null;
}

async function getActiveGroup(groupId: string) {
  const [group] = await db
    .select({ type: groups.type, visibility: groups.visibility, status: groups.status })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.status, "active")))
    .limit(1);
  return group ?? null;
}

export async function canManageMaterial(userId: string, materialId: string) {
  const material = await getPublishedMaterial(materialId);
  if (!material) return false;

  const group = await getActiveGroup(material.groupId);
  if (!group) return false;

  return hasGroupPermission(userId, material.groupId, "manageMaterials");
}

export async function canViewMaterial(userId: string, materialId: string) {
  const material = await getPublishedMaterial(materialId);
  if (!material) return false;

  const group = await getActiveGroup(material.groupId);
  if (!group) return false;

  if (material.visibility === "public") {
    return group.type === "public" && group.visibility === "discoverable";
  }

  return Boolean(await getGroupMembership(userId, material.groupId));
}
