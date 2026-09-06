import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  try {
    await requireUser();
    const rows = await db.select().from(groups).where(
      and(eq(groups.status, "active"), eq(groups.visibility, "discoverable")),
    );

    return Response.json({ groups: rows });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to discover groups" }, { status: 500 });
  }
}
