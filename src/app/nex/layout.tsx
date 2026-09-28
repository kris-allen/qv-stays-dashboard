import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/shell";

const NAV = [
  { href: "/nex", label: "Overview" },
  { href: "/nex/operations", label: "Operations" },
  { href: "/nex/finance", label: "Owner invoices" },
  { href: "/nex/inventory", label: "Inventory" },
  { href: "/nex/issues", label: "Issues" },
];

export default async function NexLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("nex");
  return (
    <DashboardShell title="Nex Dashboard" user={user} nav={NAV}>
      {children}
    </DashboardShell>
  );
}
