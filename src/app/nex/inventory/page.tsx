import { getStockForecast, type StockLine } from "@/lib/data";
import { updateStock } from "@/app/actions";
import { Badge, PageHeader, Section, Table, Td, buttonClass, inputClass } from "@/components/ui";

function StockTable({ lines, editable }: { lines: StockLine[]; editable?: boolean }) {
  return (
    <Table
      head={["Item", "Supplier", "On hand", "Reorder point", "14 day use", "Projected", "", ...(editable ? ["Stocktake"] : [])]}
      empty={lines.length === 0}
    >
      {lines.map((s) => (
        <tr key={`${s.tab}:${s.id}`}>
          <Td>{s.item}</Td>
          <Td>{s.supplier}</Td>
          <Td className="tabular-nums">
            {s.onHand} {s.unit}
          </Td>
          <Td className="tabular-nums">{s.reorderPoint}</Td>
          <Td className="tabular-nums">{s.forecastUse}</Td>
          <Td className="tabular-nums">{s.projected}</Td>
          <Td>{s.trigger ? <Badge tone="warning">Reorder</Badge> : <Badge tone="good">OK</Badge>}</Td>
          {editable && (
            <Td>
              <form action={updateStock} className="flex gap-2">
                <input type="hidden" name="tab" value={s.tab} />
                <input type="hidden" name="id" value={s.id} />
                <input name="on_hand" defaultValue={s.onHand} inputMode="numeric" className={`${inputClass} w-20`} aria-label={`On hand for ${s.item}`} />
                <button className={buttonClass}>Update</button>
              </form>
            </Td>
          )}
        </tr>
      ))}
    </Table>
  );
}

export default async function InventoryPage() {
  const stock = await getStockForecast();
  const amenities = stock.filter((s) => s.tab === "Stock_Amenities");
  const linen = stock.filter((s) => s.tab === "Stock_Linen");
  const triggers = stock.filter((s) => s.trigger);
  const forecastShort = [...stock].sort((a, b) => a.projected - a.reorderPoint - (b.projected - b.reorderPoint));

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Projected stock takes every scheduled clean in the next 14 days and the per clean usage for each property size."
      />
      <div id="triggers">
        <Section title={`Stock order triggers (${triggers.length})`}>
          <StockTable lines={triggers} />
        </Section>
      </div>
      <div id="amenities">
        <Section title="Amenities (Bunzl)">
          <StockTable lines={amenities} editable />
        </Section>
      </div>
      <div id="linen">
        <Section title="Linen (Sincerity)">
          <StockTable lines={linen} editable />
        </Section>
      </div>
      <div id="forecast">
        <Section title="Booking forecast vs current stock, tightest first">
          <StockTable lines={forecastShort} />
        </Section>
      </div>
    </>
  );
}
