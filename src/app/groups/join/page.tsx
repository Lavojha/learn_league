"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinGroupPage() {
  const router = useRouter(); const [code, setCode] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if(loading)return; setLoading(true); setMessage(""); try { const r=await fetch("/api/groups/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({inviteCode:code.trim()})}); const d=await r.json(); if(!r.ok)return setMessage(d.error??"Invalid invite code"); if(d.status==="joined"||d.status==="already_member")router.push("/groups"); else setMessage("Join request sent."); }catch{setMessage("Unable to join group. Please try again.");}finally{setLoading(false);} };
  return <main className="mx-auto min-h-screen max-w-xl px-6 py-10"><Link href="/groups" className="muted text-sm">← Groups</Link><div className="card mt-6 p-7"><h1 className="text-3xl font-bold">Join a group</h1><p className="muted mt-2">Enter the invite code shared by a group admin.</p><form onSubmit={submit} className="mt-7 space-y-4"><input required minLength={4} maxLength={128} value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} className="input text-center font-mono tracking-[0.25em]" placeholder="INVITE CODE" /><button disabled={loading||!code.trim()} className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{loading?"Joining...":"Join group"}</button></form>{message&&<p className="mt-4 rounded-xl bg-white/5 p-3 text-sm">{message}</p>}</div></main>;
}
