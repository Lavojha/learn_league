import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materialProgress } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canViewMaterial } from "@/lib/materials/permissions";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  if (!(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
  const [progress] = await db.select().from(materialProgress).where(and(eq(materialProgress.materialId, materialId), eq(materialProgress.userId, user.id))).limit(1);
  return Response.json({ progress: progress ?? null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    if (!(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
    const body = await request.json();
    const progressPercent = Math.max(0, Math.min(100, Number(body.progressPercent ?? 0)));
    const totalStudySeconds = Math.max(0, Math.floor(Number(body.totalStudySeconds ?? 0)));
    if (!Number.isFinite(progressPercent) || !Number.isFinite(totalStudySeconds)) return Response.json({ error: "Invalid progress" }, { status: 400 });
    const completed = Boolean(body.completed) || progressPercent >= 100;
    const [progress] = await db.insert(materialProgress).values({ materialId, userId: user.id, progressPercent, totalStudySeconds, completed, lastOpenedAt: new Date(), completedAt: completed ? new Date() : null }).onConflictDoUpdate({ target: [materialProgress.materialId, materialProgress.userId], set: { progressPercent, totalStudySeconds, completed, lastOpenedAt: new Date(), completedAt: completed ? new Date() : null, updatedAt: new Date() } }).returning();
    return Response.json({ success: true, progress });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid progress" }, { status: 400 });
  }
}
