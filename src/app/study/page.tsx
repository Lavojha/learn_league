import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { personalStudySessions, personalTasks } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export default async function StudyPage() {
  const user = await requireUser();
  const [tasks, sessions] = await Promise.all([
    db.select().from(personalTasks).where(eq(personalTasks.userId, user.id)).orderBy(desc(personalTasks.createdAt)).limit(20),
    db.select().from(personalStudySessions).where(eq(personalStudySessions.userId, user.id)).orderBy(desc(personalStudySessions.startedAt)).limit(10),
  ]);
  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const totalSeconds = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-1 text-3xl font-bold">Personal Study</h1><p className="muted mt-1">Study with or without your own material.</p></div>
        <Link href="/study/timer" className="rounded-xl bg-violet-500 px-5 py-3 text-center font-semibold">Start timer</Link>
      </header>
      <div className="grid gap-5 md:grid-cols-3">
        <section className="card p-5"><p className="muted text-sm">Study time</p><p className="mt-2 text-3xl font-bold">{Math.floor(totalSeconds / 3600)}h {Math.floor((totalSeconds % 3600) / 60)}m</p></section>
        <section className="card p-5"><p className="muted text-sm">Open tasks</p><p className="mt-2 text-3xl font-bold">{openTasks.length}</p></section>
        <section className="card p-5"><p className="muted text-sm">Completed tasks</p><p className="mt-2 text-3xl font-bold">{completedTasks.length}</p></section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Tasks</h2><span className="muted text-xs">Personal only</span></div><div className="mt-4 space-y-3">{tasks.length ? tasks.map((task) => <div key={task.id} className={`rounded-xl bg-white/5 p-3 ${task.completed ? "opacity-50 line-through" : ""}`}>{task.title}{task.description ? <p className="muted mt-1 text-sm">{task.description}</p> : null}</div>) : <p className="muted text-sm">No tasks yet.</p>}</div></section>
        <section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent sessions</h2><Link href="/study/history" className="text-sm text-violet-400">All history →</Link></div><div className="mt-4 space-y-3">{sessions.length ? sessions.map((session) => <div key={session.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3"><span>{new Date(session.startedAt).toLocaleDateString()}</span><span className="muted">{Math.floor(session.durationSeconds / 60)} min</span></div>) : <p className="muted text-sm">No study sessions yet.</p>}</div></section>
      </div>
    </main>
  );
}
