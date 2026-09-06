import { requireUser } from "@/lib/auth/require-user";
import { getMaterial, getActiveMaterialSession } from "@/lib/materials/access";
import { canViewMaterial } from "@/lib/materials/permissions";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const material = await getMaterial(materialId);
  if (!material || material.status !== "published" || !(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
  const session = await getActiveMaterialSession(user.id, materialId);
  if (!session) return Response.json({ error: "An active access session is required" }, { status: 403 });
  const now = new Date();
  if (material.availableUntil && now >= material.availableUntil) return Response.json({ error: "Material availability has expired" }, { status: 403 });
  if (session.status === "active" && now >= session.expiresAt) return Response.json({ error: "Access session expired" }, { status: 403 });
  const signedUrl = await createSignedFileUrl(material.storageKey, false, 120);
  return Response.json({ signedUrl, expiresAt: session.expiresAt, status: session.status, allowPause: material.allowPause });
}
