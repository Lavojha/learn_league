import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, materialTags, materials } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getGroupMembership } from "@/lib/groups/membership";
import { hasGroupPermission } from "@/lib/groups/permissions";
import { normalizeTags } from "@/lib/utils/strings";
import { createMaterialSchema, isSupportedPdf } from "@/lib/validation/materials";

export async function GET(request: Request) {
  const user = await requireUser();
  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) return Response.json({ error: "groupId is required" }, { status: 400 });
  const [group] = await db.select({ type: groups.type, visibility: groups.visibility, status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
  if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
  const isMember = (await getGroupMembership(user.id, groupId)) !== null;
  const isPublicGroup = group.type === "public" && group.visibility === "discoverable";
  if (!isPublicGroup && !isMember) return Response.json({ error: "Not a group member" }, { status: 403 });
  const conditions = [eq(materials.groupId, groupId), eq(materials.status, "published")];
  if (!isMember) conditions.push(eq(materials.visibility, "public"));
  const rows = await db.select().from(materials).where(and(...conditions));
  return Response.json({ materials: rows });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const groupId = String(body.groupId ?? "");
    const input = createMaterialSchema.parse(body);
    if (!(await hasGroupPermission(user.id, groupId, "manageMaterials"))) return Response.json({ error: "Permission denied" }, { status: 403 });
    const [group] = await db.select({ type: groups.type, visibility: groups.visibility, status: groups.status }).from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group || group.status !== "active") return Response.json({ error: "Group not found" }, { status: 404 });
    const visibility = body.visibility === "public" ? "public" : "group";
    if (visibility === "public" && (group.type !== "public" || group.visibility !== "discoverable")) return Response.json({ error: "Public material requires a discoverable public group" }, { status: 400 });
    if (!body.storageKey || !body.originalFileName || !body.mimeType || !Number.isInteger(body.fileSizeBytes) || !isSupportedPdf(String(body.mimeType), Number(body.fileSizeBytes))) return Response.json({ error: "Valid PDF file metadata is required" }, { status: 400 });

    const [material] = await db.insert(materials).values({
      groupId, uploadedBy: user.id, title: input.title, description: input.description ?? null,
      storageKey: String(body.storageKey), originalFileName: String(body.originalFileName), mimeType: String(body.mimeType),
      fileSizeBytes: Number(body.fileSizeBytes), status: "published", visibility,
      availabilityMode: input.availabilityMode, availableFrom: input.availableFrom ?? null, availableUntil: input.availableUntil ?? null,
      accessDurationMinutes: input.accessDurationMinutes, allowPause: input.allowPause, downloadEnabled: input.downloadEnabled,
      downloadStartMode: input.downloadStartMode ?? null, downloadAvailableFrom: input.downloadAvailableFrom ?? null,
      downloadAvailableUntil: input.downloadAvailableUntil ?? null, expiryAction: input.expiryAction,
      publicAt: visibility === "public" ? new Date() : null,
    }).returning();
    const tags = normalizeTags(input.tags);
    if (material && tags.length) await db.insert(materialTags).values(tags.map((tag) => ({ materialId: material.id, tag })));
    return Response.json({ success: true, material });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
