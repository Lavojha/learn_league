import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { createGroupSchema } from "@/lib/validation/groups";
import { createId } from "@/lib/utils/ids";

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, user.id));
    const ids = memberships.filter((m) => m.status === "active").map((m) => m.groupId);

    if (ids.length === 0) return Response.json({ groups: [] });

    const rows = await db.select().from(groups);
    return Response.json({ groups: rows.filter((group) => ids.includes(group.id)) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = createGroupSchema.parse(body);
    const groupId = createId();

    const [group] = await db.insert(groups).values({
      id: groupId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      visibility: input.visibility,
      ownerId: user.id,
      inviteCode: input.type === "private" ? createId().replaceAll("-", "").slice(0, 10).toUpperCase() : null,
    }).returning();

    await db.insert(groupMembers).values({ groupId, userId: user.id, role: "owner", status: "active" });

    return Response.json({ group }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to create group" }, { status: 400 });
  }
}
