"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Material = { id: string; title: string; description: string | null; visibility: string; status: string; availableFrom: string | null; availableUntil: string | null };
export default function GroupMaterialsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState(""); const [materials, setMaterials] = useState<Material[]>([]); const [error, setError] = useState("");
  useEffect(() => { params.then(({ groupId }) => { setGroupId(groupId); fetch(`/api/materials?groupId=${groupId}`).then(async r => { const d = await r.json(); if (!r.ok) setError(d.error ?? "Unable to load materials"); else setMaterials(d.materials ?? []); }); }); }, [params]);
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><Link href={`/groups/${groupId}`} className="muted text-sm">← Group</Link><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Study materials</h1><p className="muted mt-1">PDFs shared with this group.</p></div><Link href={`/materials/upload?groupId=${groupId}`} className="rounded-xl bg-violet-500 px-4 py-3 text-center font-semibold">Upload PDF</Link></div>{error && <p className="mt-6 text-rose-300">{error}</p>}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{materials.map(m => <Link key={m.id} href={`/materials/${m.id}`} className="card p-5 hover:bg-white/[0.06]"><div className="flex justify-between gap-3"><h2 className="font-semibold">{m.title}</h2><span className="muted text-xs capitalize">{m.visibility}</span></div><p className="muted mt-2 line-clamp-2 text-sm">{m.description || "No description"}</p><p className="muted mt-4 text-xs capitalize">{m.status}</p></Link>)}{!materials.length && !error && <p className="muted">No materials available yet.</p>}</div></main>;
}
