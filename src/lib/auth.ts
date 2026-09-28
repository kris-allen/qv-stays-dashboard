import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "nex" | "se" | "client";

export type AppUser = {
  id: string;
  email: string;
  role: Role;
  /** SE name as it appears on the Cleans and SE_Roster tabs. */
  seName: string | null;
  /** Client org as it appears on the Properties tab (e.g. "Quinovic Viaduct"). */
  clientOrg: string | null;
};

export const HOME_BY_ROLE: Record<Role, string> = {
  nex: "/nex",
  se: "/se",
  client: "/client",
};

/** app_metadata is only writable with the service role key, so users can't change their own role. */
export function toAppUser(user: User): AppUser | null {
  const meta = user.app_metadata ?? {};
  const role = meta.role;
  if (role !== "nex" && role !== "se" && role !== "client") return null;
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    seName: typeof meta.se_name === "string" ? meta.se_name : null,
    clientOrg: typeof meta.client_org === "string" ? meta.client_org : null,
  };
}

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? toAppUser(user) : null;
}

/** For server components/actions: returns the user or redirects if the role doesn't match. */
export async function requireRole(...roles: Role[]): Promise<AppUser> {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
