import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth/get-user";

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
