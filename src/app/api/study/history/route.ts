import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { personalStudySessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export async function GET() {
  try {
    const user = await requireUser();
    const sessions = await db.select().from(personalStudySessions).where(eq(personalStudySessions.userId, user.id)).orderBy(desc(personalStudySessions.startedAt)).limit(200);
    const [total] = await db.select({ totalSeconds: sql<number>`coalesce(sum(${personalStudySessions.durationSeconds}), 0)` }).from(personalStudySessions).where(eq(personalStudySessions.userId, user.id));
    return Response.json({ sessions, totalSeconds: Number(total?.totalSeconds ?? 0) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load study history" }, { status: 500 });
  }
}
