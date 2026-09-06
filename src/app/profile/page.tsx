import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10"><Link href="/dashboard" className="muted text-sm">← Dashboard</Link><section className="card mt-6 p-7"><p className="text-sm text-violet-400">Learn League account</p><h1 className="mt-2 text-3xl font-bold">Profile</h1><div className="mt-7 space-y-4"><div><p className="muted text-xs">Display name</p><p className="mt-1 font-medium">{profile?.displayName ?? user.user_metadata?.display_name ?? "Learner"}</p></div><div><p className="muted text-xs">Email</p><p className="mt-1 break-all font-medium">{user.email}</p></div></div><form action="/api/auth/logout" method="post" className="mt-8"><button className="rounded-xl bg-rose-500/10 px-5 py-3 text-sm text-rose-300">Sign out</button></form></section></main>;
}
