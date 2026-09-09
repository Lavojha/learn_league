import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { personalMaterials } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import PersonalMaterialActions from "./actions";

const materialIdSchema = z.string().uuid();

export default async function PersonalMaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const user = await requireUser();
  const { materialId: rawMaterialId } = await params;
  const materialId = materialIdSchema.safeParse(rawMaterialId);
  if (!materialId.success) return <main className="mx-auto max-w-3xl px-6 py-12"><p>Material not found.</p><Link href="/materials/personal" className="mt-4 inline-block text-violet-300">← My materials</Link></main>;
  const [material] = await db.select().from(personalMaterials).where(and(eq(personalMaterials.id, materialId.data), eq(personalMaterials.userId, user.id))).limit(1);

  if (!material) return <main className="mx-auto max-w-3xl px-6 py-12"><p>Material not found.</p><Link href="/materials/personal" className="mt-4 inline-block text-violet-300">← My materials</Link></main>;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link href="/materials/personal" className="muted text-sm">← My materials</Link>
      <section className="card mt-6 p-7">
        <p className="text-sm text-violet-400">Personal PDF</p>
        <h1 className="mt-2 text-3xl font-bold">{material.title}</h1>
        <p className="muted mt-3">{material.description || material.originalFileName}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/materials/personal/${materialId.data}/viewer`} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold">Open PDF</Link>
          <PersonalMaterialActions materialId={materialId.data} initialTitle={material.title} initialDescription={material.description ?? ""} />
        </div>
      </section>
    </main>
  );
}
