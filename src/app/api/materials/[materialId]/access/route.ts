import { requireUser } from "@/lib/auth/require-user";
import { canStartMaterialAccess, getMaterial } from "@/lib/materials/access";
import { createMaterialSession } from "@/lib/materials/sessions";

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    const allowed = await canStartMaterialAccess(user.id, materialId);
    if (!allowed) return Response.json({ error: "Material is not currently available" }, { status: 403 });
    const material = await getMaterial(materialId);
    if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const deviceId = String(body.deviceId ?? "").trim();
    if (!deviceId || deviceId.length > 200) return Response.json({ error: "deviceId is required" }, { status: 400 });
    const session = await createMaterialSession(user.id, materialId, deviceId, material);
    return Response.json({ success: true, session });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start access" }, { status: 400 });
  }
}
