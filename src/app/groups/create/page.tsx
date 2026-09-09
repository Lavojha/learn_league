"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "private">("public");
  const [visibility, setVisibility] = useState<"discoverable" | "hidden">("discoverable");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, type, visibility }) });
      const d = await r.json();
      if (!r.ok) return setError(d.error ?? "Unable to create group");
      router.push(`/groups/${d.group.id}`);
    } catch { setError("Unable to create group. Please try again."); }
    finally { setLoading(false); }
  };

  return <main className="mx-auto min-h-screen max-w-2xl px-6 py-10"><Link href="/groups" className="muted text-sm">← Groups</Link><h1 className="mt-3 text-3xl font-bold">Create study group</h1><p className="muted mt-1">You become the owner and can manage the group hierarchy.</p><form onSubmit={submit} className="card mt-8 space-y-5 p-6"><label className="block"><span className="text-sm font-medium">Group name</span><input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="input mt-2" placeholder="Physics League" /></label><label className="block"><span className="text-sm font-medium">Description</span><textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} className="input mt-2 min-h-28" placeholder="What will this group study?" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-medium">Type</span><select value={type} onChange={(e) => setType(e.target.value as "public" | "private")} className="input mt-2"><option value="public">Public</option><option value="private">Private</option></select></label><label className="block"><span className="text-sm font-medium">Visibility</span><select value={visibility} onChange={(e) => setVisibility(e.target.value as "discoverable" | "hidden")} disabled={type === "public"} className="input mt-2"><option value="discoverable">Visible to all</option><option value="hidden">Hidden</option></select></label></div>{type === "public" && <p className="muted text-xs">Public groups are always visible in discovery.</p>}{error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<button disabled={loading || !name.trim()} className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{loading ? "Creating..." : "Create group"}</button></form></main>;
}
