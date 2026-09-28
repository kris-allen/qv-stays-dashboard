import { requireRole } from "@/lib/auth";
import { addDays } from "@/lib/cleans";
import { getIssues, getProperties, getWindow } from "@/lib/data";
import { readTab } from "@/lib/sheets";
import { ISSUE_LABELS } from "@/lib/sheet-schema";
import { formatDate } from "@/lib/labels";
import { CleansTable } from "@/components/cleans-table";
import { IssueForm } from "@/components/issue-form";
import { BarList } from "@/components/viz/bar-list";
import { Badge, Card, CountTile, PageHeader, Section, Table, Td } from "@/components/ui";

export default async function SeHome() {
  const user = await requireRole("se");
  const me = user.seName ?? "";
  const [{ now, cleans }, issues, properties, roster] = await Promise.all([
    getWindow(),
    getIssues(),
    getProperties(),
    readTab("SE_Roster"),
  ]);

  const mine = cleans.filter((c) => c.se === me && !c.cancelled);
  const tomorrow = addDays(now.date, 1);
  const today = mine.filter((c) => c.date === now.date);
  const nextDay = mine.filter((c) => c.date === tomorrow);
  const upcoming = mine.filter((c) => c.date > tomorrow);
  const overdue = mine.filter((c) => c.date < now.date && !c.completed);
  const done = mine.filter((c) => c.completed).sort((a, b) => b.date.localeCompare(a.date));

  const byWeek = new Map<string, number>();
  for (const c of done) {
    const d = new Date(`${c.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
    const label = `Week of ${formatDate(d.toISOString().slice(0, 10))}`;
    byWeek.set(label, (byWeek.get(label) ?? 0) + 1);
  }

  const myIssues = issues
    .filter((i) => i.reported_by === me || i.se === me)
    .sort((a, b) => b.date.localeCompare(a.date));
  const rosterRow = roster.find((r) => r.se_name === me);

  if (!me) {
    return (
      <Card>
        <p className="text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          Your login isn&apos;t linked to an SE name yet. Ask the Nexdo team to finish setting you up.
        </p>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title={`Kia ora ${me.split(" ")[0]}`} subtitle={`Your jobs as of ${formatDate(now.date)}.`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountTile label="Today" value={today.length} />
        <CountTile label="Tomorrow" value={nextDay.length} />
        <CountTile label="Overdue" value={overdue.length} tone={overdue.length ? "critical" : "neutral"} />
        <CountTile label="Open issues" value={myIssues.filter((i) => i.open).length} href="/se#issues" />
      </div>

      {overdue.length > 0 && (
        <Section title="Overdue, please finish or let us know">
          <CleansTable cleans={overdue} mode="complete" />
        </Section>
      )}

      <Section title="Today">
        <CleansTable cleans={today} mode="complete" />
      </Section>

      <Section title="Tomorrow">
        <CleansTable cleans={nextDay} mode="view" />
      </Section>

      <Section title="Coming up (next 2 weeks)">
        <CleansTable cleans={upcoming} mode="view" />
      </Section>

      <div id="history">
        <Section title={`Completed in the last 30 days (${done.length})`}>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Jobs completed per week" rows={[...byWeek.entries()].reverse().map(([label, value]) => ({ label, value }))} />
            <CleansTable cleans={done} mode="view" />
          </div>
        </Section>
      </div>

      <div id="issues">
        <Section title={`My issues (${myIssues.length} total, ${myIssues.filter((i) => i.open).length} open)`}>
          <Table head={["Date", "Type", "Property", "Detail", "Status"]} empty={myIssues.length === 0}>
            {myIssues.map((i) => (
              <tr key={`${i.kind}:${i.id}`}>
                <Td className="whitespace-nowrap">{formatDate(i.date)}</Td>
                <Td>{ISSUE_LABELS[i.kind]}</Td>
                <Td>{i.property}</Td>
                <Td>{i.description || i.item}</Td>
                <Td>
                  <Badge tone={i.open ? "warning" : "good"}>{i.status || "open"}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Section>
      </div>

      <Section title="Log an issue">
        <IssueForm properties={[...new Set([...mine.map((c) => c.listingName), ...[...properties.values()].map((p) => p.name)])]} />
      </Section>

      <div id="roster">
        <Section title="Roster">
          <Card>
            <p className="text-sm" style={{ color: "var(--viz-text-secondary)" }}>
              {rosterRow?.roster_days
                ? `You're rostered on: ${rosterRow.roster_days}`
                : "Your roster hasn't been set yet."}
            </p>
          </Card>
        </Section>
      </div>
    </>
  );
}
