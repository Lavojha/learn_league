import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { personalMaterials } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { createSignedFileUrl, removeStoredFile } from "@/lib/storage/supabase-storage";
import { personalMaterialIdSchema } from "@/lib/validation/study";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  personalMaterialIdSchema.parse(materialId);
  const [material] = await db.select().from(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).limit(1);
  if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
  const signedUrl = await createSignedFileUrl(material.storageKey, true, 300);
  return Response.json({ material, signedUrl });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const body = await request.json();
  const [material] = await db.update(personalMaterials).set({ title: String(body.title ?? "").trim() || undefined, description: body.description === undefined ? undefined : String(body.description ?? "").trim() || null, updatedAt: new Date() }).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).returning();
  return material ? Response.json({ success: true, material }) : Response.json({ error: "Material not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  const [material] = await db.select().from(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).limit(1);
  if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
  await db.delete(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id)));
  await removeStoredFile(material.storageKey, true);
  return Response.json({ success: true });
}
