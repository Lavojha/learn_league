"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Material = { id: string; title: string; description: string | null; originalFileName: string; createdAt: string };
export default function PersonalMaterialsPage() {
  const [items,setItems]=useState<Material[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;void fetch("/api/materials/personal").then(async r=>{const d=await r.json();if(cancelled)return;if(!r.ok)setError(d.error??"Unable to load materials");else setItems(d.materials??[]);setLoading(false);}).catch(()=>{if(!cancelled){setError("Unable to load materials");setLoading(false);}});return()=>{cancelled=true;};},[]);
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><Link href="/materials" className="muted text-sm">← Materials</Link><div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-sm text-violet-400">Private library</p><h1 className="text-3xl font-bold">My materials</h1><p className="muted mt-1">Only you can access these PDFs.</p></div><Link href="/materials/personal/upload" className="rounded-xl bg-violet-500 px-4 py-3 font-semibold">Upload PDF</Link></div>{error&&<p className="mt-6 text-rose-300">{error}</p>}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{loading?<p className="muted">Loading materials…</p>:items.map(m=><Link key={m.id} href={`/materials/personal/${m.id}`} className="card p-5 hover:bg-white/[0.06]"><h2 className="font-semibold">{m.title}</h2><p className="muted mt-2 text-sm">{m.description||m.originalFileName}</p><p className="muted mt-4 text-xs">{new Date(m.createdAt).toLocaleDateString()}</p></Link>)}{!loading&&!items.length&&!error&&<p className="muted">No personal materials yet.</p>}</div></main>;
}
