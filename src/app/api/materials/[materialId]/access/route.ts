import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canStartMaterialAccess, getMaterial } from "@/lib/materials/access";
import { createMaterialSession } from "@/lib/materials/sessions";
import { earlierDate } from "@/lib/utils/dates";

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    if (!(await canStartMaterialAccess(user.id, materialId))) return Response.json({ error: "Material is not currently available" }, { status: 403 });
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

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser();
    const { materialId } = await params;
    const body = await request.json();
    const action = String(body.action ?? "");
    const sessionId = String(body.sessionId ?? "");
    if (!sessionId || !["pause", "resume", "end"].includes(action)) return Response.json({ error: "sessionId and valid action are required" }, { status: 400 });
    const [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.materialId, materialId), eq(materialAccessSessions.userId, user.id))).limit(1);
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

    if (action === "end") {
      const [ended] = await db.update(materialAccessSessions).set({ status: "ended", endedAt: new Date() }).where(eq(materialAccessSessions.id, session.id)).returning();
      return Response.json({ success: true, session: ended });
    }
    if (action === "pause") {
      if (session.status !== "active") return Response.json({ error: "Session is not active" }, { status: 400 });
      const material = await getMaterial(materialId);
      if (!material?.allowPause) return Response.json({ error: "Pause is disabled for this material" }, { status: 403 });
      const [paused] = await db.update(materialAccessSessions).set({ status: "paused", pausedAt: new Date() }).where(eq(materialAccessSessions.id, session.id)).returning();
      return Response.json({ success: true, session: paused });
    }
    if (session.status !== "paused" || !session.pausedAt) return Response.json({ error: "Session is not paused" }, { status: 400 });
    const now = new Date();
    const pauseSeconds = Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000));
    const material = await getMaterial(materialId);
    if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
    const extendedExpiry = new Date(session.expiresAt.getTime() + pauseSeconds * 1000);
    const expiresAt = earlierDate(extendedExpiry, material.availableUntil) ?? extendedExpiry;
    if (expiresAt <= now) return Response.json({ error: "Material access has expired" }, { status: 403 });
    const [resumed] = await db.update(materialAccessSessions).set({ status: "active", pausedAt: null, pausedSeconds: session.pausedSeconds + pauseSeconds, expiresAt }).where(eq(materialAccessSessions.id, session.id)).returning();
    return Response.json({ success: true, session: resumed });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update session" }, { status: 400 });
  }
}
