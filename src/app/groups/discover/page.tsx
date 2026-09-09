"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Group = { id: string; name: string; description: string | null; type: "public" | "private"; visibility: "discoverable" | "hidden" };

export default function DiscoverGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/groups/discover").then(async (r) => {
      const d = await r.json();
      if (!cancelled) {
        if (!r.ok) setMessage(d.error ?? "Unable to load groups.");
        else setGroups(d.groups ?? []);
      }
    }).catch(() => { if (!cancelled) setMessage("Unable to load groups."); });
    return () => { cancelled = true; };
  }, []);

  const join = async (groupId: string) => {
    setBusyId(groupId);
    setMessage("Processing…");
    try {
      const r = await fetch("/api/groups/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
      const d = await r.json();
      if (!r.ok) return setMessage(d.error ?? "Unable to join group.");
      setMessage(d.status === "joined" ? "Joined successfully." : d.status === "request_pending" ? "Join request sent." : d.status === "already_member" ? "You are already a member." : "Done.");
    } catch { setMessage("Unable to join group."); }
    finally { setBusyId(""); }
  };

  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Link href="/groups" className="muted text-sm">← Groups</Link><h1 className="mt-2 text-3xl font-bold">Discover Groups</h1><p className="muted mt-1">Public groups can be joined instantly; discoverable private groups require approval.</p></div><Link href="/groups/join" className="rounded-xl bg-white/10 px-4 py-3">Use code</Link></header>{message && <div className="mb-5 rounded-xl bg-violet-500/10 p-4 text-sm text-violet-200">{message}</div>}<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{groups.map((group) => <article key={group.id} className="card p-5"><div className="flex items-center justify-between"><span className="text-xs capitalize text-violet-300">{group.type}</span><span className="muted text-xs">Discoverable</span></div><h2 className="mt-4 text-xl font-semibold">{group.name}</h2><p className="muted mt-2 min-h-10 text-sm">{group.description || "No description yet."}</p><button disabled={busyId === group.id} onClick={() => void join(group.id)} className="mt-5 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{busyId === group.id ? "Processing…" : group.type === "public" ? "Join group" : "Request to join"}</button></article>)}{!groups.length && !message && <p className="muted sm:col-span-2 lg:col-span-3">No discoverable groups found.</p>}</div></main>;
}
