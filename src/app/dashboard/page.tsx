import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { personalStudySessions, personalTasks, groupMembers, groups } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export default async function DashboardPage() {
  const user = await requireUser();
  const [tasks, sessions, memberships] = await Promise.all([
    db.select().from(personalTasks).where(and(eq(personalTasks.userId, user.id), eq(personalTasks.completed, false))).orderBy(desc(personalTasks.createdAt)).limit(5),
    db.select().from(personalStudySessions).where(eq(personalStudySessions.userId, user.id)).orderBy(desc(personalStudySessions.startedAt)).limit(5),
    db.select().from(groupMembers).where(and(eq(groupMembers.userId, user.id), eq(groupMembers.status, "active"))).limit(6),
  ]);
  const groupIds = memberships.map((m) => m.groupId);
  const userGroups = groupIds.length ? await db.select().from(groups).where(eq(groups.id, groupIds[0])) : [];
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><header className="mb-8 flex items-center justify-between"><div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="muted mt-1">Ready for your next focused session.</p></div><Link href="/study/timer" className="rounded-xl bg-violet-500 px-4 py-3 font-semibold">Start studying</Link></header><div className="grid gap-5 md:grid-cols-3"><section className="card p-5"><p className="muted text-sm">Recent sessions</p><p className="mt-2 text-3xl font-bold">{sessions.length}</p><Link className="mt-4 inline-block text-sm text-violet-400" href="/study/history">View history →</Link></section><section className="card p-5"><p className="muted text-sm">Open tasks</p><p className="mt-2 text-3xl font-bold">{tasks.length}</p><Link className="mt-4 inline-block text-sm text-violet-400" href="/study">Manage tasks →</Link></section><section className="card p-5"><p className="muted text-sm">Groups</p><p className="mt-2 text-3xl font-bold">{memberships.length}</p><Link className="mt-4 inline-block text-sm text-violet-400" href="/groups">Open groups →</Link></section></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="card p-5"><h2 className="font-semibold">Tasks</h2><div className="mt-4 space-y-3">{tasks.length ? tasks.map((task) => <div key={task.id} className="rounded-xl bg-white/5 p-3">{task.title}</div>) : <p className="muted text-sm">No pending tasks.</p>}</div></section><section className="card p-5"><h2 className="font-semibold">Your groups</h2><div className="mt-4 space-y-3">{userGroups.length ? userGroups.map((group) => <Link key={group.id} href={`/groups/${group.id}`} className="block rounded-xl bg-white/5 p-3 hover:bg-white/10">{group.name}</Link>) : <p className="muted text-sm">No groups yet. Create or discover one.</p>}</div></section></div></main>;
}
