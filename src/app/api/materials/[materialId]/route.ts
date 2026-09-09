import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materialTags, materials } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canManageMaterial, canViewMaterial } from "@/lib/materials/permissions";
import { materialIdSchema, updateMaterialSchema } from "@/lib/validation/materials";
import { normalizeTags } from "@/lib/utils/strings";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  materialIdSchema.parse(materialId);
  if (!(await canViewMaterial(user.id, materialId))) return Response.json({ error: "Material not found or inaccessible" }, { status: 404 });
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  const tags = await db.select({ tag: materialTags.tag }).from(materialTags).where(eq(materialTags.materialId, materialId));
  return Response.json({ material, tags: tags.map((row) => row.tag) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    materialIdSchema.parse(materialId);
    if (!(await canManageMaterial(user.id, materialId))) return Response.json({ error: "Permission denied" }, { status: 403 });

    const input = updateMaterialSchema.parse(await request.json());
    const material = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(materials).where(and(eq(materials.id, materialId), eq(materials.status, "published"))).limit(1);
      if (!current) throw new Error("Material not found");

      const merged = {
        title: input.title ?? current.title,
        description: input.description !== undefined ? input.description : current.description,
        tags: input.tags ?? [],
        availabilityMode: input.availabilityMode ?? current.availabilityMode,
        availableFrom: input.availableFrom !== undefined ? input.availableFrom : current.availableFrom,
        availableUntil: input.availableUntil !== undefined ? input.availableUntil : current.availableUntil,
        accessDurationMinutes: input.accessDurationMinutes ?? current.accessDurationMinutes,
        allowPause: input.allowPause ?? current.allowPause,
        expiryAction: input.expiryAction ?? current.expiryAction,
        downloadEnabled: input.downloadEnabled ?? current.downloadEnabled,
        downloadStartMode: input.downloadStartMode !== undefined ? input.downloadStartMode : current.downloadStartMode,
        downloadAvailableFrom: input.downloadAvailableFrom !== undefined ? input.downloadAvailableFrom : current.downloadAvailableFrom,
        downloadAvailableUntil: input.downloadAvailableUntil !== undefined ? input.downloadAvailableUntil : current.downloadAvailableUntil,
      };
      updateMaterialSchema.parse(merged);

      const [updated] = await tx.update(materials).set({
        title: merged.title,
        description: merged.description,
        availabilityMode: merged.availabilityMode,
        availableFrom: merged.availableFrom,
        availableUntil: merged.availableUntil,
        accessDurationMinutes: merged.accessDurationMinutes,
        allowPause: merged.allowPause,
        downloadEnabled: merged.downloadEnabled,
        downloadStartMode: merged.downloadStartMode,
        downloadAvailableFrom: merged.downloadAvailableFrom,
        downloadAvailableUntil: merged.downloadAvailableUntil,
        expiryAction: merged.expiryAction,
        updatedAt: new Date(),
      }).where(and(eq(materials.id, materialId), eq(materials.status, "published"))).returning();
      if (!updated) throw new Error("Material changed; please refresh and try again");

      if (input.tags !== undefined) {
        await tx.delete(materialTags).where(eq(materialTags.materialId, materialId));
        const tags = normalizeTags(input.tags);
        if (tags.length) await tx.insert(materialTags).values(tags.map((tag) => ({ materialId, tag })));
      }
      return updated;
    });
    return Response.json({ success: true, material });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId } = await params;
  materialIdSchema.parse(materialId);
  if (!(await canManageMaterial(user.id, materialId))) return Response.json({ error: "Permission denied" }, { status: 403 });
  const [material] = await db.update(materials).set({ status: "archived", updatedAt: new Date() }).where(and(eq(materials.id, materialId), eq(materials.status, "published"))).returning();
  return material ? Response.json({ success: true }) : Response.json({ error: "Material not found" }, { status: 404 });
}
