import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { personalStudySessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { studySessionSchema } from "@/lib/validation/study";

export async function GET() {
  const user = await requireUser();
  const sessions = await db.select().from(personalStudySessions).where(eq(personalStudySessions.userId, user.id)).orderBy(desc(personalStudySessions.startedAt)).limit(100);
  return Response.json({ sessions });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = studySessionSchema.parse(await request.json());
    const startedAt = input.startedAt ?? new Date();
    const endedAt = new Date(startedAt.getTime() + input.durationSeconds * 1000);
    const [session] = await db.insert(personalStudySessions).values({ userId: user.id, personalMaterialId: input.personalMaterialId ?? null, startedAt, endedAt, durationSeconds: input.durationSeconds }).returning();
    return Response.json({ success: true, session });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid study session" }, { status: 400 });
  }
}
