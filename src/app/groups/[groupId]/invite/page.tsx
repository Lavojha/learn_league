"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function InvitePage({ params }: { params: Promise<{ groupId: string }> }) {
  const [groupId, setGroupId] = useState(""); const [code, setCode] = useState(""); const [userId, setUserId] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { params.then(({ groupId }) => { setGroupId(groupId); fetch(`/api/groups/${groupId}/invite-code`).then(r => r.json()).then(d => setCode(d.inviteCode ?? "")); }); }, [params]);
  const regenerate = async () => { const r = await fetch(`/api/groups/${groupId}/invite-code`, { method: "POST" }); const d = await r.json(); if (r.ok) setCode(d.inviteCode); else setMessage(d.error ?? "Unable to generate code"); };
  const invite = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch(`/api/groups/${groupId}/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitedUserId: userId }) }); const d = await r.json(); setMessage(r.ok ? "Invitation sent." : d.error ?? "Unable to invite user"); if (r.ok) setUserId(""); };
  return <main className="mx-auto min-h-screen max-w-2xl px-6 py-10"><Link href={`/groups/${groupId}`} className="muted text-sm">← Group</Link><h1 className="mt-3 text-3xl font-bold">Invite members</h1><section className="card mt-7 p-6"><p className="muted text-sm">Share this invite code with someone you trust.</p><div className="mt-4 flex gap-2"><code className="flex-1 rounded-xl bg-black/30 px-4 py-3 text-center font-mono tracking-widest">{code || "—"}</code><button onClick={regenerate} className="rounded-xl bg-white/10 px-4">New code</button></div></section><form onSubmit={invite} className="card mt-5 space-y-4 p-6"><h2 className="font-semibold">Direct invitation</h2><input required value={userId} onChange={e => setUserId(e.target.value)} className="input" placeholder="User UUID" /><button className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold">Send invitation</button>{message && <p className="text-sm text-violet-300">{message}</p>}</form></main>;
}
