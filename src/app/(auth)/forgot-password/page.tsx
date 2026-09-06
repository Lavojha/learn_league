"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); setMessage(""); setLoading(true); const supabase = createClient(); const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/profile` }); if (error) setError(error.message); else setMessage("If an account exists for this email, a password reset link has been sent."); setLoading(false); }
  return <main className="flex min-h-screen items-center justify-center px-6 py-12"><form onSubmit={submit} className="card w-full max-w-md space-y-5 p-7"><div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-2 text-3xl font-bold">Reset password</h1><p className="muted mt-2">We&apos;ll send you a secure reset link.</p></div>{error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}{message && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<label className="block"><span className="mb-2 block text-sm">Email</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button disabled={loading} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button><p className="text-center text-sm text-zinc-400"><Link className="text-violet-400 hover:underline" href="/login">Back to login</Link></p></form></main>;
}
