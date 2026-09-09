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
  try {
    const user = await requireUser();
    const { materialId } = await params;
    personalMaterialIdSchema.parse(materialId);
    const body = await request.json();
    const title = body.title === undefined ? undefined : String(body.title).trim();
    const description = body.description === undefined ? undefined : String(body.description ?? "").trim() || null;
    if (title !== undefined && (!title || title.length > 200)) return Response.json({ error: "Title must be between 1 and 200 characters" }, { status: 400 });
    if (description !== undefined && description !== null && description.length > 5000) return Response.json({ error: "Description must be 5000 characters or fewer" }, { status: 400 });

    const [material] = await db.update(personalMaterials).set({
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      updatedAt: new Date(),
    }).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).returning();

    return material ? Response.json({ success: true, material }) : Response.json({ error: "Material not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    personalMaterialIdSchema.parse(materialId);
    const [material] = await db.select().from(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).limit(1);
    if (!material) return Response.json({ error: "Material not found" }, { status: 404 });

    await db.delete(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id)));
    try {
      await removeStoredFile(material.storageKey, true);
    } catch (storageError) {
      console.error("Personal material storage cleanup failed:", storageError);
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete material" }, { status: 400 });
  }
}
