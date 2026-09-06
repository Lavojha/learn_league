"use client";

import Link from "next/link";
import { useState } from "react";

export default function PersonalUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage("Choose a PDF first.");
    if (file.type !== "application/pdf") return setMessage("Only PDF files are supported.");
    if (!title.trim()) return setMessage("Enter a material name.");

    setBusy(true);
    setMessage("Uploading…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      form.append("description", description.trim());

      const upload = await fetch("/api/materials/personal", { method: "POST", body: form });
      const data = await upload.json();
      if (!upload.ok) return setMessage(data.error ?? "Upload failed");
      window.location.href = "/materials/personal";
    } catch {
      setMessage("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link href="/materials/personal" className="muted text-sm">← My materials</Link>
      <h1 className="mt-3 text-3xl font-bold">Upload personal PDF</h1>
      <form onSubmit={submit} className="card mt-7 space-y-5 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">PDF file</label>
          <input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Material name</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. Operating Systems Notes" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="input min-h-28" placeholder="Optional description" />
        </div>
        <button disabled={busy} className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Uploading…" : "Upload PDF"}</button>
        {message && <p className="text-sm text-violet-300">{message}</p>}
      </form>
    </main>
  );
}
