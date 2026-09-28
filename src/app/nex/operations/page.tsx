import { getNexOperations } from "@/lib/nex-summary";
import { formatDate } from "@/lib/labels";
import { setUpgradeStatus } from "@/app/actions";
import { CleansTable } from "@/components/cleans-table";
import { Badge, PageHeader, Section, Table, Td, buttonClass, inputClass } from "@/components/ui";

export default async function OperationsPage() {
  const ops = await getNexOperations();
  const assign = { mode: "assign" as const, seNames: ops.seNames };

  return (
    <>
      <PageHeader title="Operations" subtitle="Assign SEs and keep an eye on anything slipping." />

      <div id="failures">
        <Section title={`Booking failures (${ops.failures.length})`}>
          <CleansTable
            cleans={ops.failures.map((f) => f.clean)}
            {...assign}
            note={(c) => {
              const f = ops.failures.find((x) => x.clean.key === c.key)!;
              return f.reason === "unassigned" ? (
                <Badge tone="critical">No SE assigned</Badge>
              ) : (
                <Badge tone="critical">Not ready for check in</Badge>
              );
            }}
          />
        </Section>
      </div>

      <div id="incomplete">
        <Section title={`Incomplete from yesterday (${ops.incomplete.length})`}>
          <CleansTable cleans={ops.incomplete} {...assign} />
        </Section>
      </div>

      <div id="next-day">
        <Section title={`Next day bookings (${ops.nextDay.length})`}>
          <CleansTable cleans={ops.nextDay} {...assign} />
        </Section>
      </div>

      <div id="sdt">
        <Section title={`Same day turnovers, next 7 days (${ops.sdt.length})`}>
          <CleansTable cleans={ops.sdt} {...assign} />
        </Section>
      </div>

      <div id="midstay-topup">
        <Section title={`Midstay top ups, next 7 days (${ops.midstayTopups.length})`}>
          <CleansTable cleans={ops.midstayTopups} {...assign} />
        </Section>
      </div>

      <div id="midstay-clean">
        <Section title={`Midstay cleans, next 7 days (${ops.midstayCleans.length})`}>
          <CleansTable cleans={ops.midstayCleans} {...assign} />
        </Section>
      </div>

      <div id="cancelled">
        <Section title={`Cancelled tasks (${ops.cancelled.length})`}>
          <CleansTable cleans={ops.cancelled} mode="view" />
        </Section>
      </div>

      <div id="upgrades">
        <Section title={`Upgrades (${ops.openUpgrades.length} awaiting a decision)`}>
          <Table head={["Date", "Property", "Requested by", "Description", "Status", ""]} empty={ops.upgrades.length === 0}>
            {ops.upgrades.map((u) => (
              <tr key={u.id}>
                <Td className="whitespace-nowrap">{formatDate(u.date)}</Td>
                <Td>{u.property}</Td>
                <Td>{u.requested_by}</Td>
                <Td>
                  {u.description}
                  {u.photo_link && (
                    <>
                      {" "}
                      <a href={u.photo_link} target="_blank" rel="noreferrer" className="underline">
                        photo
                      </a>
                    </>
                  )}
                </Td>
                <Td>
                  <Badge>{u.status || "requested"}</Badge>
                </Td>
                <Td>
                  <form action={setUpgradeStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="status" defaultValue={u.status} className={inputClass} aria-label="Upgrade status">
                      <option value="requested">Requested</option>
                      <option value="sent to PM">Sent to PM</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                      <option value="done">Done</option>
                    </select>
                    <button className={buttonClass}>Save</button>
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
