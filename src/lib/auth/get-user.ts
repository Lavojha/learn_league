import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to get authenticated user:", error);
    return null;
  }

  return data.user;
}
