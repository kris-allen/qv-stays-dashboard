/**
 * Give someone access: creates the Supabase user if needed and sets their role.
 *
 *   npx tsx --env-file=.env.local scripts/set-role.ts kris@nexdo.co.nz nex
 *   npx tsx --env-file=.env.local scripts/set-role.ts sumit@example.com se "Sumit Bishnoi"
 *   npx tsx --env-file=.env.local scripts/set-role.ts pm@quinovic.co.nz client "Quinovic Viaduct"
 *
 * The third argument is the SE name (as on the Cleans / SE_Roster tabs) or the
 * client org (as on the Properties tab).
 */
import { createClient } from "@supabase/supabase-js";

const [email, role, name] = process.argv.slice(2);
if (!email || !["nex", "se", "client"].includes(role)) {
  console.error("Usage: set-role.ts <email> <nex|se|client> [SE name or client org]");
  process.exit(1);
}
if ((role === "se" || role === "client") && !name) {
  console.error(`A ${role} needs a ${role === "se" ? "SE name" : "client org"} as the third argument.`);
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const app_metadata = {
  role,
  se_name: role === "se" ? name : null,
  client_org: role === "client" ? name : null,
};

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, { app_metadata });
  if (error) throw error;
  console.log(`Updated ${email} → ${role}${name ? ` (${name})` : ""}`);
} else {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata });
  if (error) throw error;
  console.log(`Created ${email} → ${role}${name ? ` (${name})` : ""}. They can now sign in with a magic link.`);
}
