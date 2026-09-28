import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/shell";

const NAV = [
  { href: "/client", label: "Overview" },
  { href: "/client#turnovers", label: "Upcoming turnovers" },
  { href: "/client#delivery", label: "Service delivery" },
  { href: "/client#issues", label: "Issues" },
  { href: "/client#invoices", label: "Owner invoices" },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client");
  return (
    <DashboardShell title="Client Dashboard" user={user} nav={NAV}>
      {children}
    </DashboardShell>
  );
}
