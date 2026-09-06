import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions, materialProgress } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canViewMaterial } from "@/lib/materials/permissions";
import { materialIdSchema } from "@/lib/validation/materials";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  materialIdSchema.parse(materialId);
  if (!(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
  const [progress] = await db.select().from(materialProgress).where(and(eq(materialProgress.materialId, materialId), eq(materialProgress.userId, user.id))).limit(1);
  return Response.json({ progress: progress ?? null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    materialIdSchema.parse(materialId);
    if (!(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });

    const [session] = await db.select({ id: materialAccessSessions.id, status: materialAccessSessions.status, expiresAt: materialAccessSessions.expiresAt })
      .from(materialAccessSessions)
      .where(and(eq(materialAccessSessions.materialId, materialId), eq(materialAccessSessions.userId, user.id), inArray(materialAccessSessions.status, ["active", "paused"])))
      .limit(1);
    if (!session) return Response.json({ error: "An active material session is required" }, { status: 403 });
    if (session.status === "active" && new Date() >= session.expiresAt) return Response.json({ error: "Material access session has expired" }, { status: 403 });

    const body = await request.json();
    const rawPercent = Number(body.progressPercent ?? 0);
    const rawSeconds = Number(body.totalStudySeconds ?? 0);
    if (!Number.isFinite(rawPercent) || !Number.isFinite(rawSeconds) || rawPercent < 0 || rawPercent > 100 || rawSeconds < 0 || !Number.isInteger(rawSeconds)) return Response.json({ error: "Invalid progress" }, { status: 400 });

    const [existing] = await db.select().from(materialProgress).where(and(eq(materialProgress.materialId, materialId), eq(materialProgress.userId, user.id))).limit(1);
    const progressPercent = Math.max(existing?.progressPercent ?? 0, rawPercent);
    const totalStudySeconds = Math.max(existing?.totalStudySeconds ?? 0, rawSeconds);
    const completed = Boolean(existing?.completed) || Boolean(body.completed) || progressPercent >= 100;
    const [progress] = await db.insert(materialProgress).values({ materialId, userId: user.id, progressPercent, totalStudySeconds, completed, lastOpenedAt: new Date(), completedAt: completed ? (existing?.completedAt ?? new Date()) : null }).onConflictDoUpdate({ target: [materialProgress.materialId, materialProgress.userId], set: { progressPercent, totalStudySeconds, completed, lastOpenedAt: new Date(), completedAt: completed ? (existing?.completedAt ?? new Date()) : null, updatedAt: new Date() } }).returning();
    return Response.json({ success: true, progress });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid progress" }, { status: 400 });
  }
}
