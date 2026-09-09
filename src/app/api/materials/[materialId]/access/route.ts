import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canStartMaterialAccess, getMaterial } from "@/lib/materials/access";
import { createMaterialSession } from "@/lib/materials/sessions";
import { earlierDate } from "@/lib/utils/dates";
import { materialIdSchema } from "@/lib/validation/materials";

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser(); const materialId = materialIdSchema.parse((await params).materialId);
    if (!(await canStartMaterialAccess(user.id, materialId))) return Response.json({ error: "Material is not currently available" }, { status: 403 });
    const material = await getMaterial(materialId); if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
    const body = await request.json().catch(() => ({})); const deviceId = String(body.deviceId ?? "").trim();
    if (!deviceId || deviceId.length > 200) return Response.json({ error: "deviceId is required" }, { status: 400 });
    try { const session = await createMaterialSession(user.id, materialId, deviceId, material); return Response.json({ success: true, session }); }
    catch (error) { if (error instanceof Error && (error.message.toLowerCase().includes("duplicate key") || error.message.toLowerCase().includes("unique constraint"))) return Response.json({ error: "This material is already open in another active session" }, { status: 409 }); throw error; }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to start access" }, { status: 400 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user = await requireUser(); const materialId = materialIdSchema.parse((await params).materialId); const body = await request.json();
    const action = String(body.action ?? ""); const sessionId = String(body.sessionId ?? ""); const deviceId = String(body.deviceId ?? "").trim();
    if (!sessionId || !deviceId || deviceId.length > 200 || !["pause", "resume", "end"].includes(action)) return Response.json({ error: "sessionId, deviceId and valid action are required" }, { status: 400 });
    const [session] = await db.select().from(materialAccessSessions).where(and(eq(materialAccessSessions.id, sessionId), eq(materialAccessSessions.materialId, materialId), eq(materialAccessSessions.userId, user.id), eq(materialAccessSessions.deviceId, deviceId))).limit(1);
    if (!session) return Response.json({ error: "Session not found for this device" }, { status: 404 });
    if (action === "end") { if (!["active", "paused"].includes(session.status)) return Response.json({ error: "Session is already closed" }, { status: 400 }); const [ended] = await db.update(materialAccessSessions).set({ status: "ended", endedAt: new Date() }).where(and(eq(materialAccessSessions.id, session.id), inArray(materialAccessSessions.status, ["active", "paused"]))).returning(); return ended ? Response.json({ success: true, session: ended }) : Response.json({ error: "Session changed; please refresh" }, { status: 409 }); }
    const material = await getMaterial(materialId); if (!material) return Response.json({ error: "Material not found" }, { status: 404 }); const now = new Date();
    if (material.availableUntil && now >= material.availableUntil) { await db.update(materialAccessSessions).set({ status: "expired", endedAt: now }).where(and(eq(materialAccessSessions.id, session.id), inArray(materialAccessSessions.status, ["active", "paused"]))); return Response.json({ error: "Material availability has expired" }, { status: 403 }); }
    if (action === "pause") { if (session.status !== "active") return Response.json({ error: "Session is not active" }, { status: 400 }); if (now >= session.expiresAt) { const [expired] = await db.update(materialAccessSessions).set({ status: "expired", endedAt: now }).where(and(eq(materialAccessSessions.id, session.id), eq(materialAccessSessions.status, "active"))).returning(); return Response.json({ error: "Material access has expired", session: expired }, { status: 403 }); } if (!material.allowPause) return Response.json({ error: "Pause is disabled for this material" }, { status: 403 }); const [paused] = await db.update(materialAccessSessions).set({ status: "paused", pausedAt: now }).where(and(eq(materialAccessSessions.id, session.id), eq(materialAccessSessions.status, "active"))).returning(); return paused ? Response.json({ success: true, session: paused }) : Response.json({ error: "Session changed; please refresh" }, { status: 409 }); }
    if (session.status !== "paused" || !session.pausedAt) return Response.json({ error: "Session is not paused" }, { status: 400 });
    const pauseSeconds = Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)); const extendedExpiry = new Date(session.expiresAt.getTime() + pauseSeconds * 1000); const expiresAt = earlierDate(extendedExpiry, material.availableUntil) ?? extendedExpiry; if (expiresAt <= now) return Response.json({ error: "Material access has expired" }, { status: 403 });
    const [resumed] = await db.update(materialAccessSessions).set({ status: "active", pausedAt: null, pausedSeconds: session.pausedSeconds + pauseSeconds, expiresAt }).where(and(eq(materialAccessSessions.id, session.id), eq(materialAccessSessions.status, "paused"))).returning();
    return resumed ? Response.json({ success: true, session: resumed }) : Response.json({ error: "Session changed; please refresh" }, { status: 409 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update session" }, { status: 400 }); }
}
