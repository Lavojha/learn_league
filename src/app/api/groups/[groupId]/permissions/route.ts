import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groupPermissions, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getDefaultRolePermissions, hasGroupPermission } from "@/lib/groups/permissions";
import { isGroupRole } from "@/lib/groups/roles";

const permissionKeys = ["manageMembers", "manageMaterials", "manageGroupInfo", "manageInvitations", "manageJoinRequests", "manageContent"] as const;

type PermissionKey = (typeof permissionKeys)[number];

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!(await hasGroupPermission(user.id, groupId, "manageMembers"))) return Response.json({ error: "Permission denied" }, { status: 403 });
  const rows = await db.select().from(groupPermissions).where(eq(groupPermissions.groupId, groupId));
  return Response.json({ permissions: rows });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    const [actor] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id), eq(groupMembers.status, "active"))).limit(1);
    const [group] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!actor || actor.role !== "owner") return Response.json({ error: "Only the owner can edit role permissions" }, { status: 403 });

    const body = await request.json();
    const role = String(body.role ?? "");
    if (!isGroupRole(role)) return Response.json({ error: "Invalid role" }, { status: 400 });
    if (!body.permissions || typeof body.permissions !== "object" || Array.isArray(body.permissions)) return Response.json({ error: "permissions must be an object" }, { status: 400 });

    const defaults = getDefaultRolePermissions(role);
    const values = { ...defaults };
    for (const key of permissionKeys) {
      if (key in body.permissions) {
        if (typeof body.permissions[key] !== "boolean") return Response.json({ error: `${key} must be boolean` }, { status: 400 });
        values[key] = body.permissions[key] as boolean;
      }
    }

    const [row] = await db.insert(groupPermissions).values({ groupId, role, ...values }).onConflictDoUpdate({ target: [groupPermissions.groupId, groupPermissions.role], set: { ...values, updatedAt: new Date() } }).returning();
    return Response.json({ success: true, permissions: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
