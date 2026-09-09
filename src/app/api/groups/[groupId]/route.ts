import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessGroup } from "@/lib/groups/access";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { updateGroupSchema } from "@/lib/validation/groups";
import { z } from "zod";

const groupIdSchema = z.string().uuid();

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    if (!(await canAccessGroup(user.id, groupId))) return Response.json({ error: "Group not found or inaccessible" }, { status: 404 });
    const [group] = await db.select({ id: groups.id, name: groups.name, description: groups.description, type: groups.type, visibility: groups.visibility, status: groups.status, ownerId: groups.ownerId, createdAt: groups.createdAt, updatedAt: groups.updatedAt }).from(groups).where(and(eq(groups.id, groupId), eq(groups.status, "active"))).limit(1);
    return group ? Response.json({ group }) : Response.json({ error: "Group not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load group" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const input = updateGroupSchema.parse(await request.json());
    const [current] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current || current.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!(await hasGroupPermission(user.id, groupId, "manageGroupInfo"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const nextType = input.type ?? current.type;
    const nextVisibility = input.visibility ?? current.visibility;
    if (nextType === "public" && nextVisibility === "hidden") return Response.json({ error: "Public groups must be discoverable" }, { status: 400 });
    const [group] = await db.update(groups).set({ ...input, updatedAt: new Date() }).where(and(eq(groups.id, groupId), eq(groups.status, "active"))).returning({ id: groups.id, name: groups.name, description: groups.description, type: groups.type, visibility: groups.visibility, status: groups.status, ownerId: groups.ownerId, createdAt: groups.createdAt, updatedAt: groups.updatedAt });
    return group ? Response.json({ success: true, group }) : Response.json({ error: "Group changed; please refresh" }, { status: 409 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const groupId = groupIdSchema.parse((await params).groupId);
    const [current] = await db.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!current || current.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    if (!(await hasGroupPermission(user.id, groupId, "manageGroupInfo"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [group] = await db.update(groups).set({ status: "archived", updatedAt: new Date() }).where(and(eq(groups.id, groupId), eq(groups.status, "active"))).returning({ id: groups.id });
    return group ? Response.json({ success: true }) : Response.json({ error: "Group changed; please refresh" }, { status: 409 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to archive group" }, { status: 400 });
  }
}
