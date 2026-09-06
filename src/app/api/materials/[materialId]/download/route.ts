import { requireUser } from "@/lib/auth/require-user";
import { getMaterial } from "@/lib/materials/access";
import { canViewMaterial } from "@/lib/materials/permissions";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const material = await getMaterial(materialId);
  if (!material || material.status !== "published" || !(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
  if (!material.downloadEnabled) return Response.json({ error: "Download is disabled" }, { status: 403 });
  const now = new Date();
  if (material.downloadStartMode === "after_access" && material.availableUntil && now < material.availableUntil) return Response.json({ error: "Download becomes available after viewing access ends" }, { status: 403 });
  if (material.downloadAvailableFrom && now < material.downloadAvailableFrom) return Response.json({ error: "Download is not available yet" }, { status: 403 });
  if (material.downloadAvailableUntil && now >= material.downloadAvailableUntil) return Response.json({ error: "Download window has expired" }, { status: 403 });
  const signedUrl = await createSignedFileUrl(material.storageKey, false, 300);
  return Response.json({ signedUrl, fileName: material.originalFileName });
}
