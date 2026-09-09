import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groupPermissions, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getDefaultRolePermissions } from "@/lib/groups/permissions";
import { createGroupSchema } from "@/lib/validation/groups";
import { createId } from "@/lib/utils/ids";

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, user.id), eq(groupMembers.status, "active")));
    const ids = memberships.map((m) => m.groupId);
    if (ids.length === 0) return Response.json({ groups: [] });
    const rows = await db.select().from(groups).where(inArray(groups.id, ids));
    return Response.json({ groups: rows.filter((group) => group.status === "active") });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = createGroupSchema.parse(await request.json());
    const groupId = createId();
    const inviteCode = input.type === "private" ? createId().replaceAll("-", "").slice(0, 10).toUpperCase() : null;

    const group = await db.transaction(async (tx) => {
      const [created] = await tx.insert(groups).values({ id: groupId, name: input.name, description: input.description ?? null, type: input.type, visibility: input.visibility, ownerId: user.id, inviteCode }).returning();
      if (!created) throw new Error("Unable to create group");
      await tx.insert(groupMembers).values({ groupId, userId: user.id, role: "owner", status: "active" });
      await tx.insert(groupPermissions).values(["owner", "co_owner", "admin", "member"].map((role) => ({ groupId, role: role as "owner" | "co_owner" | "admin" | "member", ...getDefaultRolePermissions(role as "owner" | "co_owner" | "admin" | "member") })));
      return created;
    });
    return Response.json({ group }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create group" }, { status: 400 });
  }
}
