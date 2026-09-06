import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canAccessGroup } from "@/lib/groups/access";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { updateGroupSchema } from "@/lib/validation/groups";

export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!(await canAccessGroup(user.id, groupId))) return Response.json({ error: "Group not found or inaccessible" }, { status: 404 });
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
  return Response.json({ group });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await requireUser();
    const { groupId } = await params;
    if (!(await hasGroupPermission(user.id, groupId, "manageGroupInfo"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const input = updateGroupSchema.parse(await request.json());
    const [group] = await db.update(groups).set({ ...input, updatedAt: new Date() }).where(eq(groups.id, groupId)).returning();
    return group ? Response.json({ success: true, group }) : Response.json({ error: "Group not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
