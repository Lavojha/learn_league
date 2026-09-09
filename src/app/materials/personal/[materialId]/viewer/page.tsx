import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { personalMaterials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSignedFileUrl } from "@/lib/storage/supabase-storage";
import { z } from "zod";

const materialIdSchema = z.string().uuid();

export default async function PersonalMaterialViewer({ params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId: rawMaterialId } = await params;
  const parsed = materialIdSchema.safeParse(rawMaterialId);
  if (!parsed.success) return <main className="p-10"><p>Material not found.</p></main>;
  const materialId = parsed.data;
  const [material] = await db.select().from(personalMaterials).where(and(eq(personalMaterials.id, materialId), eq(personalMaterials.userId, user.id))).limit(1);
  if (!material) return <main className="p-10"><p>Material not found.</p><Link href="/materials/personal" className="mt-3 inline-block text-violet-300">← My materials</Link></main>;
  const url = await createSignedFileUrl(material.storageKey, true, 300);
  return <main className="flex min-h-screen flex-col bg-black"><header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><Link href={`/materials/personal/${materialId}`} className="muted text-sm">← Material</Link><span className="font-semibold">{material.title}</span><span className="muted text-xs">Private</span></header><iframe title={material.title} src={url} className="min-h-[calc(100vh-60px)] w-full flex-1 bg-white" /></main>;
}
