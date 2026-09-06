import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <section className="grid w-full gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">Study together. Learn smarter.</div>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">Your study group, <span className="text-violet-400">leveled up.</span></h1>
          <p className="muted mt-6 max-w-2xl text-lg leading-8">Focus with a personal timer, organize your study material, and build focused communities with clear roles and permissions.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-violet-500 px-5 py-3 font-semibold transition hover:bg-violet-400">Get started</Link>
            <Link href="/login" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10">Log in</Link>
          </div>
        </div>
        <div className="card relative overflow-hidden p-6">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between"><span className="font-semibold">Today&apos;s focus</span><span className="text-sm text-emerald-400">Active</span></div>
            <div className="flex h-48 items-center justify-center rounded-2xl border border-white/10 bg-black/20"><div className="flex h-36 w-36 items-center justify-center rounded-full border-8 border-violet-500/40 text-3xl font-bold">25:00</div></div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-xl bg-white/5 p-3"><b className="block text-xl">3</b><span className="muted">Sessions</span></div><div className="rounded-xl bg-white/5 p-3"><b className="block text-xl">2h</b><span className="muted">Focused</span></div><div className="rounded-xl bg-white/5 p-3"><b className="block text-xl">7</b><span className="muted">Tasks</span></div></div>
          </div>
        </div>
      </section>
    </main>
  );
}
