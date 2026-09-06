"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Member = { id: string; userId: string; role: "owner" | "co_owner" | "admin" | "member"; joinedAt: string };
const assignableRoles = ["co_owner", "admin", "member"] as const;

export default function MembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ groupId: id }) => {
      setGroupId(id);
      fetch(`/api/groups/${id}/members`).then(async (r) => {
        const d = await r.json();
        if (!r.ok) setMessage(d.error ?? "Unable to load members");
        else setMembers(d.members ?? []);
        setLoading(false);
      });
    });
  }, [params]);

  const updateRole = async (userId: string, role: string) => {
    const r = await fetch(`/api/groups/${groupId}/members`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    const d = await r.json();
    if (!r.ok) return setMessage(d.error ?? "Permission denied");
    setMembers((items) => items.map((x) => x.userId === userId ? { ...x, role: d.member.role } : x));
    setMessage("Role updated.");
  };

  const remove = async (userId: string) => {
    if (!window.confirm("Remove this member from the group?")) return;
    const r = await fetch(`/api/groups/${groupId}/members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    const d = await r.json();
    if (!r.ok) return setMessage(d.error ?? "Unable to remove member");
    setMembers((items) => items.filter((x) => x.userId !== userId));
    setMessage("Member removed.");
  };

  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <div className="flex items-center justify-between gap-4"><Link href={`/groups/${groupId}`} className="muted text-sm">← Group</Link><Link href={`/groups/${groupId}/invite`} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold">Invite</Link></div>
    <h1 className="mt-4 text-3xl font-bold">Members</h1>
    <p className="muted mt-1">Owner → Co-owner → Admin → Member. The server enforces the hierarchy.</p>
    {message && <p className="mt-4 text-sm text-violet-300">{message}</p>}
    <div className="mt-7 space-y-3">{loading ? <p className="muted">Loading members…</p> : members.map((m) => <div key={m.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-medium break-all">{m.userId}</p><p className="muted text-xs">{m.role.replace("_", " ")} · joined {new Date(m.joinedAt).toLocaleDateString()}</p></div>
      {m.role !== "owner" && <div className="flex gap-2"><select value={m.role} onChange={(e) => void updateRole(m.userId, e.target.value)} className="input w-auto"><option value={m.role} hidden>{m.role.replace("_", " ")}</option>{assignableRoles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select><button onClick={() => void remove(m.userId)} className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Remove</button></div>}
    </div>)}</div>
  </main>;
}
