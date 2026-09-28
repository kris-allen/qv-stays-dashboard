import { getIssues, getProperties } from "@/lib/data";
import { ISSUE_LABELS, ISSUE_TABS } from "@/lib/sheet-schema";
import { formatDate } from "@/lib/labels";
import { setIssueStatus } from "@/app/actions";
import { IssueForm } from "@/components/issue-form";
import { Badge, PageHeader, Section, Table, Td, buttonClass, inputClass } from "@/components/ui";

const STATUS_OPTIONS = {
  Maintenance: ["open", "in progress", "resolved"],
  Quality_Issues: ["open", "reclean booked", "resolved"],
  Lost_Found: ["stored", "owner contacted", "returned"],
  Damages: ["open", "reported to PM", "resolved"],
} as const;

export default async function IssuesPage() {
  const [issues, properties] = await Promise.all([getIssues(), getProperties()]);

  return (
    <>
      <PageHeader title="Issues" subtitle="Maintenance, quality, lost and found, and damages, newest first." />

      <Section title="Log a new issue">
        <IssueForm properties={[...properties.values()].map((p) => p.name)} />
      </Section>

      {ISSUE_TABS.map((kind) => {
        const rows = issues.filter((i) => i.kind === kind).sort((a, b) => b.date.localeCompare(a.date));
        const open = rows.filter((r) => r.open).length;
        return (
          <div id={kind} key={kind}>
            <Section title={`${ISSUE_LABELS[kind]} (${open} open)`}>
              <Table head={["Date", "Property", "Reported by", "Detail", "Status", ""]} empty={rows.length === 0}>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <Td className="whitespace-nowrap">{formatDate(i.date)}</Td>
                    <Td>{i.property}</Td>
                    <Td>{i.reported_by}</Td>
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
                    <Td>
                      <form action={setIssueStatus} className="flex gap-2">
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={i.id} />
                        <select name="status" defaultValue={i.status} className={inputClass} aria-label="Issue status">
                          {STATUS_OPTIONS[kind].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className={buttonClass}>Save</button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Section>
          </div>
        );
      })}
    </>
  );
}
