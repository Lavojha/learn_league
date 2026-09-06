"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RequestRow = { id: string; userId: string; createdAt: string };
export default function RequestsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState(""); const [requests, setRequests] = useState<RequestRow[]>([]); const [message, setMessage] = useState("");
  const load = (id: string) => fetch(`/api/groups/${id}/join-requests`).then(r => r.json()).then(d => setRequests(d.requests ?? []));
  useEffect(() => { params.then(({ groupId }) => { setGroupId(groupId); load(groupId); }); }, [params]);
  const review = async (requestId: string, status: "approved" | "rejected") => { const r = await fetch(`/api/groups/${groupId}/join-requests`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, status }) }); const d = await r.json(); if (!r.ok) return setMessage(d.error ?? "Unable to review request"); setRequests(x => x.filter(v => v.id !== requestId)); };
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10"><Link href={`/groups/${groupId}`} className="muted text-sm">← Group</Link><h1 className="mt-3 text-3xl font-bold">Join requests</h1><p className="muted mt-1">Approve or reject people requesting access.</p>{message && <p className="mt-4 text-sm text-rose-300">{message}</p>}<div className="mt-7 space-y-3">{requests.map(r => <div key={r.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{r.userId}</p><p className="muted text-xs">{new Date(r.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><button onClick={() => review(r.id, "rejected")} className="rounded-xl bg-white/10 px-4 py-2 text-sm">Reject</button><button onClick={() => review(r.id, "approved")} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold">Approve</button></div></div>)}{!requests.length && <p className="muted">No pending requests.</p>}</div></main>;
}
