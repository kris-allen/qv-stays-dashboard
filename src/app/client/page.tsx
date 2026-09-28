import { requireRole } from "@/lib/auth";
import { addDays } from "@/lib/cleans";
import { getIssues, getProperties, getWindow } from "@/lib/data";
import { readTab } from "@/lib/sheets";
import { ISSUE_LABELS } from "@/lib/sheet-schema";
import { formatDate } from "@/lib/labels";
import { confirmOwnerInvoice } from "@/app/actions";
import { CleansTable } from "@/components/cleans-table";
import { BarList } from "@/components/viz/bar-list";
import { Badge, Card, CountTile, PageHeader, Section, Table, Td, buttonClass } from "@/components/ui";

export default async function ClientHome() {
  const user = await requireRole("client");
  const [{ now, cleans }, properties, issues, invoices] = await Promise.all([
    getWindow(),
    getProperties(),
    getIssues(),
    readTab("Owner_Departure_Invoices"),
  ]);

  const myProperties = [...properties.values()].filter((p) => p.clientOrg && p.clientOrg === user.clientOrg);
  const myListingIds = new Set(myProperties.map((p) => p.listingId));
  const myNames = new Set(myProperties.map((p) => p.name));

  if (myProperties.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          No properties are linked to your account yet. The Nexdo team will set this up shortly.
        </p>
      </Card>
    );
  }

  const mine = cleans.filter((c) => myListingIds.has(c.listingId));
  const weekAhead = addDays(now.date, 7);
  const turnovers = mine.filter((c) => !c.cancelled && c.date >= now.date && c.date <= weekAhead);
  const past = mine.filter((c) => !c.cancelled && c.date < now.date);
  const completed = past.filter((c) => c.completed);
  const completionRate = past.length ? Math.round((completed.length / past.length) * 100) : 100;

  const myIssues = issues.filter((i) => myNames.has(i.property)).sort((a, b) => b.date.localeCompare(a.date));
  const openIssues = myIssues.filter((i) => i.open);
  const issuesByProperty = new Map<string, number>();
  for (const i of openIssues) issuesByProperty.set(i.property, (issuesByProperty.get(i.property) ?? 0) + 1);

  const invoicesToConfirm = invoices.filter(
    (inv) => inv.invoice_sent === "yes" && inv.confirmed !== "yes" && myListingIds.has(inv.clean_key.split(":")[0]),
  );

  return (
    <>
      <PageHeader title={user.clientOrg ?? "Your portfolio"} subtitle={`Service delivery at a glance, ${formatDate(now.date)}.`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountTile label="Properties" value={myProperties.length} />
        <CountTile label="Turnovers next 7 days" value={turnovers.length} href="/client#turnovers" />
        <CountTile label="Cleans completed (30 days)" value={`${completionRate}%`} hint={`${completed.length} of ${past.length}`} href="/client#delivery" />
        <CountTile label="Open issues" value={openIssues.length} href="/client#issues" tone={openIssues.length ? "warning" : "neutral"} />
      </div>

      <div id="turnovers">
        <Section title="Upcoming turnovers">
          <CleansTable cleans={turnovers} mode="view" />
        </Section>
      </div>

      <div id="delivery">
        <Section title="Service delivery, last 30 days">
          <CleansTable cleans={[...past].reverse()} mode="view" />
        </Section>
      </div>

      <div id="issues">
        <Section title={`Issues (${openIssues.length} open)`}>
          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Open issues by property" rows={[...issuesByProperty.entries()].map(([label, value]) => ({ label, value }))} />
            <div className="lg:col-span-2">
              <Table head={["Date", "Type", "Property", "Detail", "Status"]} empty={myIssues.length === 0}>
                {myIssues.map((i) => (
                  <tr key={`${i.kind}:${i.id}`}>
                    <Td className="whitespace-nowrap">{formatDate(i.date)}</Td>
                    <Td>{ISSUE_LABELS[i.kind]}</Td>
                    <Td>{i.property}</Td>
                    <Td>
                      {i.description || i.item}
                      {i.photo_link && (
                        <>
                          {" "}
                          <a href={i.photo_link} target="_blank" rel="noreferrer" className="underline">
                            photo
                          </a>
                        </>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={i.open ? "warning" : "good"}>{i.status || "open"}</Badge>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        </Section>
      </div>

      <div id="invoices">
        <Section title={`Owner departure invoices to confirm (${invoicesToConfirm.length})`}>
          <Table head={["Clean date", "Property", "Amount", ""]} empty={invoicesToConfirm.length === 0}>
            {invoicesToConfirm.map((inv) => (
              <tr key={inv.id}>
                <Td className="whitespace-nowrap">{formatDate(inv.clean_date)}</Td>
                <Td>{inv.property}</Td>
                <Td className="tabular-nums">{inv.amount ? `$${inv.amount}` : "—"}</Td>
                <Td>
                  <form action={confirmOwnerInvoice}>
                    <input type="hidden" name="clean_key" value={inv.clean_key} />
                    <button className={buttonClass}>Confirm</button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        </Section>
      </div>
    </>
  );
}
