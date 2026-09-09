import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getMaterial } from "@/lib/materials/access";
import { canViewMaterial } from "@/lib/materials/permissions";
import { db } from "@/db";
import { materialTags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const materialIdSchema = z.string().uuid();

export default async function MaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser(); const { materialId: rawMaterialId } = await params; const parsed = materialIdSchema.safeParse(rawMaterialId);
  if (!parsed.success) return <main className="mx-auto max-w-3xl px-6 py-12"><p>Material not found or inaccessible.</p><Link href="/materials" className="mt-4 inline-block text-violet-300">← Materials</Link></main>;
  const materialId = parsed.data; const material = await getMaterial(materialId);
  if (!material || material.status !== "published" || !(await canViewMaterial(user.id, materialId))) return <main className="mx-auto max-w-3xl px-6 py-12"><p>Material not found or inaccessible.</p><Link href="/materials" className="mt-4 inline-block text-violet-300">← Materials</Link></main>;
  const tags = await db.select({ tag: materialTags.tag }).from(materialTags).where(eq(materialTags.materialId, materialId));
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10"><Link href="/materials" className="muted text-sm">← Materials</Link><section className="card mt-6 p-7"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs capitalize text-violet-300">{material.visibility}</span><span className="muted text-xs">PDF · {Math.ceil(material.fileSizeBytes / 1024 / 1024)} MB</span></div><h1 className="mt-4 text-3xl font-bold">{material.title}</h1><p className="muted mt-3">{material.description || "No description provided."}</p><div className="mt-5 flex flex-wrap gap-2">{tags.map(({ tag }) => <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">#{tag}</span>)}</div><div className="mt-8 flex flex-wrap gap-3"><Link href={`/materials/${materialId}/viewer`} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold">Start study session</Link>{material.downloadEnabled && <a href={`/api/materials/${materialId}/download`} className="rounded-xl bg-white/10 px-5 py-3">Download PDF</a>}</div></section><section className="mt-5 grid gap-4 sm:grid-cols-3"><div className="card p-5"><p className="muted text-xs">Access duration</p><p className="mt-2 font-semibold">{material.accessDurationMinutes} minutes</p></div><div className="card p-5"><p className="muted text-xs">Pause</p><p className="mt-2 font-semibold">{material.allowPause ? "Enabled" : "Disabled"}</p></div><div className="card p-5"><p className="muted text-xs">Availability</p><p className="mt-2 font-semibold">{material.availableUntil ? new Date(material.availableUntil).toLocaleString() : "No end date"}</p></div></section></main>;
}
