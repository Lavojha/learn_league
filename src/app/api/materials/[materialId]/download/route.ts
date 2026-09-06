import { requireUser } from "@/lib/auth/require-user";
import { getMaterial } from "@/lib/materials/access";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const material = await getMaterial(materialId);
  if (!material || material.status !== "published") return Response.json({ error: "Material not found" }, { status: 404 });
  if (material.visibility !== "public") return Response.json({ error: "Download access requires group membership" }, { status: 403 });
  if (!material.downloadEnabled) return Response.json({ error: "Download is disabled" }, { status: 403 });
  const now = new Date();
  if (material.downloadAvailableFrom && now < material.downloadAvailableFrom) return Response.json({ error: "Download is not available yet" }, { status: 403 });
  if (material.downloadAvailableUntil && now >= material.downloadAvailableUntil) return Response.json({ error: "Download window has expired" }, { status: 403 });
  const signedUrl = await createSignedFileUrl(material.storageKey, false, 300);
  return Response.json({ signedUrl, fileName: material.originalFileName });
}
