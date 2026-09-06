import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export default async function GroupsPage() {
  const user = await requireUser();
  const memberships = await db.select({ group: groups, role: groupMembers.role }).from(groupMembers).innerJoin(groups, eq(groups.id, groupMembers.groupId)).where(and(eq(groupMembers.userId, user.id), eq(groupMembers.status, "active"), eq(groups.status, "active"))).orderBy(desc(groups.updatedAt));
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-violet-400">Learn League</p><h1 className="mt-1 text-3xl font-bold">Study Groups</h1><p className="muted mt-1">Create, discover and manage your study leagues.</p></div><div className="flex gap-2"><Link href="/groups/discover" className="rounded-xl bg-white/10 px-4 py-3 font-medium">Discover</Link><Link href="/groups/create" className="rounded-xl bg-violet-500 px-4 py-3 font-semibold">Create group</Link></div></header><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{memberships.length ? memberships.map(({ group, role }) => <Link href={`/groups/${group.id}`} key={group.id} className="card p-5 transition hover:-translate-y-0.5"><div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs capitalize text-violet-300">{group.type}</span><span className="muted text-xs capitalize">{role.replace("_", " ")}</span></div><h2 className="text-xl font-semibold">{group.name}</h2><p className="muted mt-2 line-clamp-2 text-sm">{group.description || "No description yet."}</p></Link>) : <div className="card p-8 sm:col-span-2 lg:col-span-3"><h2 className="text-lg font-semibold">No groups yet</h2><p className="muted mt-2">Create your first study group or discover one to join.</p></div>}</div></main>;
}
