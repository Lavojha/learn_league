"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Member = { id: string; userId: string; role: "owner" | "co_owner" | "admin" | "member"; joinedAt: string };
const roles = ["owner", "co_owner", "admin", "member"] as const;

export default function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState(""); const [members, setMembers] = useState<Member[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { params.then(({ groupId }) => { setGroupId(groupId); fetch(`/api/groups/${groupId}/members`).then(r => r.json()).then(d => setMembers(d.members ?? [])); }); }, [params]);
  const updateRole = async (userId: string, role: string) => { const r = await fetch(`/api/groups/${groupId}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) }); const d = await r.json(); if (!r.ok) return setMessage(d.error ?? "Permission denied"); setMembers(m => m.map(x => x.userId === userId ? { ...x, role: d.member.role } : x)); setMessage("Role updated."); };
  const remove = async (userId: string) => { const r = await fetch(`/api/groups/${groupId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }); const d = await r.json(); if (!r.ok) return setMessage(d.error ?? "Unable to remove member"); setMembers(m => m.filter(x => x.userId !== userId)); };
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10"><Link href={`/groups/${groupId}`} className="muted text-sm">← Group</Link><h1 className="mt-3 text-3xl font-bold">Members</h1><p className="muted mt-1">Role hierarchy is enforced by the server.</p>{message && <p className="mt-4 text-sm text-violet-300">{message}</p>}<div className="mt-7 space-y-3">{members.map(m => <div key={m.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{m.userId}</p><p className="muted text-xs">Joined {new Date(m.joinedAt).toLocaleDateString()}</p></div><div className="flex gap-2"><select value={m.role} disabled={m.role === "owner"} onChange={e => updateRole(m.userId, e.target.value)} className="input w-auto"><option value="owner">Owner</option>{roles.slice(1).map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select>{m.role !== "owner" && <button onClick={() => remove(m.userId)} className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Remove</button>}</div></div>)}</div></main>;
}
