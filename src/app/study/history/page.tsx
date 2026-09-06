import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { personalStudySessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function StudyHistoryPage() {
  const user = await requireUser();
  const sessions = await db.select().from(personalStudySessions).where(eq(personalStudySessions.userId, user.id)).orderBy(desc(personalStudySessions.startedAt)).limit(100);
  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10"><header className="mb-8 flex items-center justify-between"><div><p className="text-sm text-violet-400">Personal Study</p><h1 className="mt-1 text-3xl font-bold">Study History</h1></div><Link href="/study/timer" className="rounded-xl bg-violet-500 px-4 py-3 font-semibold">Start session</Link></header><section className="card mb-5 p-5"><p className="muted text-sm">Recorded study time</p><p className="mt-2 text-3xl font-bold">{Math.floor(totalSeconds / 3600)}h {Math.floor((totalSeconds % 3600) / 60)}m</p></section><section className="card p-5"><h2 className="font-semibold">Sessions</h2><div className="mt-4 space-y-3">{sessions.length ? sessions.map((s) => <div key={s.id} className="flex flex-col gap-1 rounded-xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{new Date(s.startedAt).toLocaleString()}</p><p className="muted text-sm">{s.personalMaterialId ? "Personal material session" : "Timer-only session"}</p></div><span className="text-sm text-violet-300">{Math.floor(s.durationSeconds / 60)} min</span></div>) : <p className="muted text-sm">No sessions recorded yet.</p>}</div></section></main>;
}
