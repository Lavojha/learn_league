import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupPermissions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getDefaultRolePermissions, hasGroupPermission } from "@/lib/groups/permissions";
import { isGroupRole } from "@/lib/groups/roles";

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
    const actor = await db.query.groupMembers.findFirst({ where: (m, { and, eq }) => and(eq(m.groupId, groupId), eq(m.userId, user.id), eq(m.status, "active")) });
    if (!actor || actor.role !== "owner") return Response.json({ error: "Only the owner can edit role permissions" }, { status: 403 });
    const body = await request.json();
    if (!isGroupRole(String(body.role))) return Response.json({ error: "Invalid role" }, { status: 400 });
    const defaults = getDefaultRolePermissions(body.role);
    const values = { ...defaults, ...body.permissions };
    const [row] = await db.insert(groupPermissions).values({ groupId, role: body.role, ...values }).onConflictDoUpdate({ target: [groupPermissions.groupId, groupPermissions.role], set: { ...values, updatedAt: new Date() } }).returning();
    return Response.json({ success: true, permissions: row });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
