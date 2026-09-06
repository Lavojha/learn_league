import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getMaterial } from "@/lib/materials/access";
import { canViewMaterial } from "@/lib/materials/permissions";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";
import { materialIdSchema } from "@/lib/validation/materials";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  materialIdSchema.parse(materialId);
  const material = await getMaterial(materialId);
  if (!material || material.status !== "published" || !(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });

  const now = new Date();
  const availabilityExpired = Boolean(material.availableUntil && now >= material.availableUntil);
  const expiryAllowsDownload = availabilityExpired && material.expiryAction === "enable_download";

  if (availabilityExpired && material.expiryAction === "archive") {
    await db.update(materialAccessSessions).set({ status: "expired", endedAt: now }).where(and(eq(materialAccessSessions.materialId, materialId), inArray(materialAccessSessions.status, ["active", "paused"]), eq(materialAccessSessions.userId, user.id)));
    return Response.json({ error: "Material has expired and is archived" }, { status: 403 });
  }
  if (availabilityExpired && material.expiryAction === "remove_access") return Response.json({ error: "Material access has expired" }, { status: 403 });

  const downloadEnabled = material.downloadEnabled || expiryAllowsDownload;
  if (!downloadEnabled) return Response.json({ error: "Download is disabled" }, { status: 403 });

  if (material.downloadStartMode === "after_access") {
    let [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.userId, user.id), eq(materialAccessSessions.materialId, materialId), inArray(materialAccessSessions.status, ["active", "paused", "expired", "ended"]))).orderBy(desc(materialAccessSessions.createdAt)).limit(1);
    if (!session) return Response.json({ error: "You must complete viewing access before downloading" }, { status: 403 });

    if ((session.status === "active" || session.status === "paused") && now >= session.expiresAt) {
      [session] = await db.update(materialAccessSessions).set({ status: "expired", endedAt: now }).where(and(eq(materialAccessSessions.id, session.id), inArray(materialAccessSessions.status, ["active", "paused"]))).returning();
    }
    if (!session) return Response.json({ error: "Unable to verify viewing access" }, { status: 409 });
    if (session.status === "active" || session.status === "paused") return Response.json({ error: "Download becomes available after viewing access ends" }, { status: 403 });
  }

  if (material.downloadAvailableFrom && now < material.downloadAvailableFrom) return Response.json({ error: "Download is not available yet" }, { status: 403 });
  if (material.downloadAvailableUntil && now >= material.downloadAvailableUntil) return Response.json({ error: "Download window has expired" }, { status: 403 });
  const signedUrl = await createSignedFileUrl(material.storageKey, false, 300);
  return Response.json({ signedUrl, fileName: material.originalFileName });
}
