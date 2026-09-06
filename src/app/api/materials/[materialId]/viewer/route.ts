import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getMaterial } from "@/lib/materials/access";
import { canViewMaterial } from "@/lib/materials/permissions";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";
import { materialIdSchema } from "@/lib/validation/materials";

export async function GET(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  materialIdSchema.parse(materialId);
  const material = await getMaterial(materialId);
  if (!material || material.status !== "published" || !(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });

  const search = new URL(request.url).searchParams;
  const sessionId = search.get("sessionId");
  const deviceId = search.get("deviceId");
  if (!sessionId || !deviceId || deviceId.length > 200) return Response.json({ error: "sessionId and deviceId are required" }, { status: 400 });

  const [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.userId, user.id), eq(materialAccessSessions.materialId, materialId), eq(materialAccessSessions.deviceId, deviceId), inArray(materialAccessSessions.status, ["active", "paused"]))).limit(1);
  if (!session) return Response.json({ error: "Access session not found for this device" }, { status: 403 });

  const now = new Date();
  if (material.availableUntil && now >= material.availableUntil) return Response.json({ error: "Material availability has expired" }, { status: 403 });
  if (session.status === "active" && now >= session.expiresAt) return Response.json({ error: "Access session expired" }, { status: 403 });
  const signedUrl = await createSignedFileUrl(material.storageKey, false, 120);
  return Response.json({ signedUrl, expiresAt: session.expiresAt, status: session.status, allowPause: material.allowPause });
}
