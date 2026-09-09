"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
    if (error) setError(error.message);
    else if (data.session) router.push("/dashboard");
    else setMessage("Account created. Check your email if confirmation is enabled.");
    setLoading(false);
  }

  return <main className="flex min-h-screen items-center justify-center px-6 py-12"><form onSubmit={submit} className="card w-full max-w-md space-y-5 p-7"><div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-2 text-3xl font-bold">Create account</h1><p className="muted mt-2">Start studying with your league.</p></div>{error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}{message && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<label className="block"><span className="mb-2 block text-sm">Display name</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></label><label className="block"><span className="mb-2 block text-sm">Email</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="block"><span className="mb-2 block text-sm">Password</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={loading} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{loading ? "Creating…" : "Create account"}</button><p className="text-center text-sm text-zinc-400">Already have an account? <Link className="text-violet-400 hover:underline" href="/login">Log in</Link></p></form></main>;
}
