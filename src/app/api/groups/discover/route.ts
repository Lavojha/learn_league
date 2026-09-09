import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  try {
    await requireUser();
    const rows = await db.select({ id: groups.id, name: groups.name, description: groups.description, type: groups.type, visibility: groups.visibility, status: groups.status, ownerId: groups.ownerId, createdAt: groups.createdAt }).from(groups).where(and(eq(groups.status, "active"), eq(groups.visibility, "discoverable")));
    return Response.json({ groups: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to discover groups";
    const status = message.toLowerCase().includes("redirect") || message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return Response.json({ error: status === 401 ? "Authentication required" : "Unable to discover groups" }, { status });
  }
}
