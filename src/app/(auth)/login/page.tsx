"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    else router.push("/dashboard");
    setLoading(false);
  }

  return <main className="flex min-h-screen items-center justify-center px-6 py-12"><form onSubmit={submit} className="card w-full max-w-md space-y-5 p-7"><div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-2 text-3xl font-bold">Welcome back</h1><p className="muted mt-2">Continue your study journey.</p></div>{error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<label className="block"><span className="mb-2 block text-sm">Email</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-400" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="block"><span className="mb-2 block text-sm">Password</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-violet-400" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button disabled={loading} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{loading ? "Logging in…" : "Log in"}</button><p className="text-center text-sm text-zinc-400">New here? <Link className="text-violet-400 hover:underline" href="/signup">Create account</Link></p></form></main>;
}
