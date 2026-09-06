import { eq } from "drizzle-orm";
import { db } from "@/db";
import { personalMaterials } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { createSignedFileUrl, removeStoredFile } from "@/lib/storage/supabase-storage";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const [material] = await db.select().from(personalMaterials).where(eq(personalMaterials.id, materialId)).limit(1);
  if (!material || material.userId !== user.id) return Response.json({ error: "Material not found" }, { status: 404 });
  const signedUrl = await createSignedFileUrl(material.storageKey, true, 300);
  return Response.json({ material, signedUrl });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const [material] = await db.select().from(personalMaterials).where(eq(personalMaterials.id, materialId)).limit(1);
  if (!material || material.userId !== user.id) return Response.json({ error: "Material not found" }, { status: 404 });
  await removeStoredFile(material.storageKey, true);
  await db.delete(personalMaterials).where(eq(personalMaterials.id, materialId));
  return Response.json({ success: true });
}
