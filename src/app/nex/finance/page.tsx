import { getNexOperations } from "@/lib/nex-summary";
import { formatDate } from "@/lib/labels";
import { markOwnerInvoiceSent } from "@/app/actions";
import { Badge, PageHeader, Section, Table, Td, buttonClass, inputClass } from "@/components/ui";

export default async function FinancePage() {
  const { ownerDepartures } = await getNexOperations();
  const rows = [...ownerDepartures].sort((a, b) => b.clean.date.localeCompare(a.clean.date));

  return (
    <>
      <PageHeader
        title="Owner departure invoices"
        subtitle="When an owner stays, their departure clean is invoiced to them. Send it here; Quinovic confirms on their dashboard."
      />
      <Section title="Last 30 days and tomorrow">
        <Table head={["Clean date", "Property", "Clean", "Invoice", "Confirmed", ""]} empty={rows.length === 0}>
          {rows.map(({ clean, invoice }) => (
            <tr key={clean.key}>
              <Td className="whitespace-nowrap">{formatDate(clean.date)}</Td>
              <Td>{clean.listingName}</Td>
              <Td>{clean.completed ? <Badge tone="good">Done</Badge> : <Badge>Scheduled</Badge>}</Td>
              <Td>
                {invoice?.invoice_sent === "yes" ? (
                  <Badge tone="good">Sent{invoice.amount ? ` · $${invoice.amount}` : ""}</Badge>
                ) : (
                  <Badge tone="warning">Not sent</Badge>
                )}
              </Td>
              <Td>
                {invoice?.confirmed === "yes" ? (
                  <Badge tone="good">Confirmed</Badge>
                ) : (
                  <span style={{ color: "var(--viz-text-muted)" }}>Waiting</span>
                )}
              </Td>
              <Td>
                {invoice?.invoice_sent !== "yes" && (
                  <form action={markOwnerInvoiceSent} className="flex gap-2">
                    <input type="hidden" name="clean_key" value={clean.key} />
                    <input name="amount" placeholder="Amount" inputMode="decimal" className={`${inputClass} w-24`} />
                    <button className={buttonClass}>Mark sent</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}
