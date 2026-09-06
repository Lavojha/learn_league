import type { User } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  user: User;
  profile: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}
