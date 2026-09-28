import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/shell";

const NAV = [
  { href: "/se", label: "My jobs" },
  { href: "/se#history", label: "History" },
  { href: "/se#issues", label: "Issues" },
  { href: "/se#roster", label: "Roster" },
];

export default async function SeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("se");
  return (
    <DashboardShell title="SE Dashboard" user={user} nav={NAV}>
      {children}
    </DashboardShell>
  );
}
