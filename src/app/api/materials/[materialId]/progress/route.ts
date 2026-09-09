import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { materialAccessSessions, materialProgress } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { canViewMaterial } from "@/lib/materials/permissions";
import { materialIdSchema } from "@/lib/validation/materials";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try { const user=await requireUser(); const materialId=materialIdSchema.parse((await params).materialId); if(!(await canViewMaterial(user.id,materialId)))return Response.json({error:"Material not found or inaccessible"},{status:404}); const [progress]=await db.select({id:materialProgress.id,materialId:materialProgress.materialId,userId:materialProgress.userId,progressPercent:materialProgress.progressPercent,totalStudySeconds:materialProgress.totalStudySeconds,completed:materialProgress.completed,lastOpenedAt:materialProgress.lastOpenedAt,completedAt:materialProgress.completedAt,updatedAt:materialProgress.updatedAt}).from(materialProgress).where(and(eq(materialProgress.materialId,materialId),eq(materialProgress.userId,user.id))).limit(1); return Response.json({progress:progress??null}); }
  catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to load progress"},{status:400});}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const user=await requireUser(); const materialId=materialIdSchema.parse((await params).materialId); if(!(await canViewMaterial(user.id,materialId)))return Response.json({error:"Material not found or inaccessible"},{status:404});
    const [session]=await db.select({id:materialAccessSessions.id,status:materialAccessSessions.status,expiresAt:materialAccessSessions.expiresAt}).from(materialAccessSessions).where(and(eq(materialAccessSessions.materialId,materialId),eq(materialAccessSessions.userId,user.id),inArray(materialAccessSessions.status,["active","paused"]))).limit(1); if(!session)return Response.json({error:"An active material session is required"},{status:403});
    if(session.status==="active"&&new Date()>=session.expiresAt){await db.update(materialAccessSessions).set({status:"expired",endedAt:new Date()}).where(and(eq(materialAccessSessions.id,session.id),eq(materialAccessSessions.status,"active")));return Response.json({error:"Material access session has expired"},{status:403});}
    const body=await request.json(); const rawPercent=Number(body.progressPercent??0); const rawSeconds=Number(body.totalStudySeconds??0); if(!Number.isFinite(rawPercent)||!Number.isFinite(rawSeconds)||rawPercent<0||rawPercent>100||rawSeconds<0||!Number.isInteger(rawSeconds))return Response.json({error:"Invalid progress"},{status:400});
    const [existing]=await db.select().from(materialProgress).where(and(eq(materialProgress.materialId,materialId),eq(materialProgress.userId,user.id))).limit(1); const progressPercent=Math.max(existing?.progressPercent??0,rawPercent); const totalStudySeconds=Math.max(existing?.totalStudySeconds??0,rawSeconds); const completed=Boolean(existing?.completed)||Boolean(body.completed)||progressPercent>=100; const completedAt=completed?(existing?.completedAt??new Date()):null;
    const [progress]=await db.insert(materialProgress).values({materialId,userId:user.id,progressPercent,totalStudySeconds,completed,lastOpenedAt:new Date(),completedAt}).onConflictDoUpdate({target:[materialProgress.materialId,materialProgress.userId],set:{progressPercent,totalStudySeconds,completed,lastOpenedAt:new Date(),completedAt,updatedAt:new Date()}}).returning(); return progress?Response.json({success:true,progress}):Response.json({error:"Unable to save progress"},{status:409});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Invalid progress"},{status:400});}
}
