"use client";

import { useState } from "react";

export default function OwnershipTransfer({ groupId }: { groupId: string }) {
  const [userId, setUserId] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const transfer = async () => { if (!userId.trim() || !window.confirm("Transfer group ownership to this member?")) return; setBusy(true); const r = await fetch(`/api/groups/${groupId}/transfer-ownership`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOwnerId: userId.trim() }) }); const d = await r.json(); setBusy(false); if (!r.ok) return setMessage(d.error ?? "Unable to transfer ownership"); setMessage("Ownership transferred. Refreshing…"); window.location.href = `/groups/${groupId}`; };
  return <div className="card mt-7 p-6"><h2 className="font-semibold">Transfer ownership</h2><p className="muted mt-1 text-sm">The new owner must already be a co-owner or admin.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={userId} onChange={e => setUserId(e.target.value)} className="input" placeholder="Existing member UUID" /><button disabled={busy} onClick={() => void transfer()} className="rounded-xl bg-rose-500/15 px-5 py-3 text-sm font-semibold text-rose-300 disabled:opacity-50">{busy ? "Transferring…" : "Transfer"}</button></div>{message && <p className="mt-3 text-sm text-violet-300">{message}</p>}</div>;
}
