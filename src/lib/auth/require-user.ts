import { getUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";

export async function requireUser() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
