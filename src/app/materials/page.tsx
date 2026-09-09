import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { materials, personalMaterials } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function MaterialsPage() {
  const user = await requireUser();
  const [personal, uploaded] = await Promise.all([
    db.select().from(personalMaterials).where(eq(personalMaterials.userId, user.id)).orderBy(desc(personalMaterials.createdAt)).limit(30),
    db.select().from(materials).where(eq(materials.uploadedBy, user.id)).orderBy(desc(materials.createdAt)).limit(30),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-violet-400">Learn League</p>
          <h1 className="mt-1 text-3xl font-bold">Materials</h1>
          <p className="muted mt-1">Your private study files and group materials you manage.</p>
        </div>
        <Link href="/materials/personal/upload" className="rounded-xl bg-violet-500 px-5 py-3 text-center font-semibold">Upload personal PDF</Link>
      </header>

      <div className="mb-5 flex flex-wrap gap-3 text-sm">
        <Link href="/materials/personal" className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5">My personal library</Link>
        <Link href="/materials/upload" className="rounded-xl border border-white/10 px-4 py-2 hover:bg-white/5">Upload group PDF</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">My personal materials</h2>
          <p className="muted mt-1 text-sm">Only you can access these files.</p>
          <div className="mt-4 space-y-3">
            {personal.length ? personal.map((m) => (
              <Link href={`/materials/personal/${m.id}`} key={m.id} className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">
                <p className="font-medium">{m.title}</p>
                <p className="muted mt-1 text-xs">{m.originalFileName}</p>
              </Link>
            )) : <p className="muted text-sm">No personal materials yet.</p>}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Group materials I uploaded</h2>
          <p className="muted mt-1 text-sm">Materials you manage as a group admin or above.</p>
          <div className="mt-4 space-y-3">
            {uploaded.length ? uploaded.map((m) => (
              <Link href={`/materials/${m.id}`} key={m.id} className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">
                <div className="flex items-center justify-between gap-3"><p className="font-medium">{m.title}</p><span className="muted text-xs">{m.visibility}</span></div>
                <p className="muted mt-1 text-xs">{m.originalFileName}</p>
              </Link>
            )) : <p className="muted text-sm">No group materials uploaded by you.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
