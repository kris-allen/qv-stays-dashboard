import { getNexOperations, getOpenIssueCounts } from "@/lib/nex-summary";
import { getStockForecast } from "@/lib/data";
import { formatDate } from "@/lib/labels";
import { CountTile, PageHeader, Section } from "@/components/ui";

export default async function NexOverview() {
  const [ops, issues, stock] = await Promise.all([getNexOperations(), getOpenIssueCounts(), getStockForecast()]);
  const triggers = stock.filter((s) => s.trigger);
  const tone = (n: number, bad: "warning" | "critical" = "warning") => (n > 0 ? bad : "neutral");
  const unconfirmedInvoices = ops.ownerDepartures.filter((o) => o.invoice?.confirmed !== "yes").length;

  return (
    <>
      <PageHeader title="Good to see you" subtitle={`Here's where things stand for ${formatDate(ops.now.date)}.`} />

      <Section title="Operations">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label="Next day bookings" value={ops.nextDay.length} href="/nex/operations#next-day" hint="Cleans due tomorrow" />
          <CountTile label="Same day turnovers" value={ops.sdt.length} href="/nex/operations#sdt" hint="Next 7 days" />
          <CountTile label="Midstay top ups" value={ops.midstayTopups.length} href="/nex/operations#midstay-topup" hint="Next 7 days" />
          <CountTile label="Midstay cleans" value={ops.midstayCleans.length} href="/nex/operations#midstay-clean" hint="Next 7 days" />
          <CountTile label="Cancelled tasks" value={ops.cancelled.length} href="/nex/operations#cancelled" />
          <CountTile label="Upgrades" value={ops.openUpgrades.length} href="/nex/operations#upgrades" hint="Awaiting a decision" />
          <CountTile label="Booking failures" value={ops.failures.length} href="/nex/operations#failures" tone={tone(ops.failures.length, "critical")} />
          <CountTile label="Incomplete from yesterday" value={ops.incomplete.length} href="/nex/operations#incomplete" tone={tone(ops.incomplete.length)} />
        </div>
      </Section>

      <Section title="Finance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label="Owner departure invoices" value={unconfirmedInvoices} href="/nex/finance" hint="Not yet confirmed" tone={tone(unconfirmedInvoices)} />
        </div>
      </Section>

      <Section title="Inventory">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label="Amenity lines" value={stock.filter((s) => s.tab === "Stock_Amenities").length} href="/nex/inventory#amenities" />
          <CountTile label="Linen lines" value={stock.filter((s) => s.tab === "Stock_Linen").length} href="/nex/inventory#linen" />
          <CountTile label="Forecast vs stock" value={`${stock.filter((s) => s.projected <= s.reorderPoint).length} short`} href="/nex/inventory#forecast" hint="Over the next 14 days" />
          <CountTile label="Stock order triggers" value={triggers.length} href="/nex/inventory#triggers" tone={tone(triggers.length)} />
        </div>
      </Section>

      <Section title="Issues">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountTile label="Maintenance requests" value={issues.maintenance} href="/nex/issues#Maintenance" hint="Open" />
          <CountTile label="Quality issues" value={issues.quality} href="/nex/issues#Quality_Issues" hint="Open" />
          <CountTile label="Lost and found" value={issues.lostFound} href="/nex/issues#Lost_Found" hint="Not yet returned" />
          <CountTile label="Damages" value={issues.damages} href="/nex/issues#Damages" hint="Open" />
        </div>
      </Section>
    </>
  );
}
