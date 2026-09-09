"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  materialId: string;
  initialTitle: string;
  initialDescription: string;
}

export default function PersonalMaterialActions({ materialId, initialTitle, initialDescription }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/materials/personal/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update material");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update material");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this personal PDF permanently?")) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/materials/personal/${materialId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete material");
      router.push("/materials/personal");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete material");
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <>
        <button type="button" onClick={() => setEditing(true)} disabled={busy} className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/5">Edit</button>
        <button type="button" onClick={remove} disabled={busy} className="rounded-xl border border-rose-400/30 px-5 py-3 font-semibold text-rose-300 hover:bg-rose-400/10">Delete</button>
        {error ? <p className="basis-full text-sm text-rose-300">{error}</p> : null}
      </>
    );
  }

  return (
    <div className="basis-full rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm"><span className="muted">Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none" /></label>
        <label className="grid gap-2 text-sm"><span className="muted">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} rows={4} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none" /></label>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={save} disabled={busy || !title.trim()} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold">{busy ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => { setEditing(false); setTitle(initialTitle); setDescription(initialDescription); setError(""); }} disabled={busy} className="rounded-xl border border-white/10 px-5 py-3 font-semibold">Cancel</button></div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
