import "server-only";
import { cache } from "react";
import { addDays, deriveCleans, nowInAuckland, trackCleans, type TrackedClean } from "@/lib/cleans";
import { getListings, getReservations } from "@/lib/hostaway";
import { readTab } from "@/lib/sheets";
import { CLOSED_STATUSES, ISSUE_TABS, type IssueTab, type Row } from "@/lib/sheet-schema";

export type Property = { listingId: string; name: string; sizeCode: string; clientOrg: string };

export const getProperties = cache(async (): Promise<Map<string, Property>> => {
  const rows = await readTab("Properties");
  return new Map(
    rows
      .filter((r) => r.listing_id && r.active.toLowerCase() !== "no")
      .map((r) => [
        r.listing_id,
        { listingId: r.listing_id, name: r.name, sizeCode: r.size_code, clientOrg: r.client_org },
      ]),
  );
});

/** Every clean overlapping the window, with SE assignment and completion from the Cleans tab. */
export const getCleans = cache(async (from: string, to: string): Promise<TrackedClean[]> => {
  const [reservations, records, properties, listings] = await Promise.all([
    getReservations(from, to),
    readTab("Cleans"),
    getProperties(),
    getListings(),
  ]);
  // Hostaway reservations don't carry the listing name, so fall back to the listings feed.
  const listingNames = new Map(listings.map((l) => [String(l.id), l.internalListingName || l.name]));
  const jobs = deriveCleans(reservations)
    .filter((j) => j.date >= from && j.date <= to)
    .map((j) => ({
      ...j,
      listingName: properties.get(j.listingId)?.name || listingNames.get(j.listingId) || j.listingName,
    }));

  return trackCleans(
    jobs,
    records.map((r) => ({ key: r.clean_key, se: r.se, status: r.status, completedAt: r.completed_at })),
  );
});

/** The standard window every dashboard works from: 30 days back, 14 days ahead. */
export async function getWindow() {
  const now = nowInAuckland();
  const from = addDays(now.date, -30);
  const to = addDays(now.date, 14);
  return { now, from, to, cleans: await getCleans(from, to) };
}

export type Issue = Row<IssueTab> & { kind: IssueTab; open: boolean };

export const getIssues = cache(async (): Promise<Issue[]> => {
  const tabs = await Promise.all(ISSUE_TABS.map((tab) => readTab(tab)));
  return tabs.flatMap((rows, i) =>
    rows.map((row) => ({
      ...(row as Row<IssueTab>),
      kind: ISSUE_TABS[i],
      open: !CLOSED_STATUSES.has(row.status.trim().toLowerCase()),
    })),
  );
});

export type StockLine = {
  tab: "Stock_Amenities" | "Stock_Linen";
  id: string;
  item: string;
  unit: string;
  supplier: string;
  onHand: number;
  reorderPoint: number;
  forecastUse: number;
  projected: number;
  trigger: boolean;
};

/**
 * Stock forecast: every scheduled clean in the next 14 days uses the per clean
 * quantity for its property's size, so projected = on hand minus that use.
 * Anything at or below its reorder point (now or projected) triggers an order.
 */
export async function getStockForecast(): Promise<StockLine[]> {
  const { now, cleans } = await getWindow();
  const [amenities, linen, usage, properties] = await Promise.all([
    readTab("Stock_Amenities"),
    readTab("Stock_Linen"),
    readTab("Stock_Usage"),
    getProperties(),
  ]);

  const upcoming = cleans.filter((c) => !c.cancelled && c.date >= now.date);
  const perClean = new Map(usage.map((u) => [`${u.item}|${u.size_code}`, Number(u.units_per_clean) || 0]));

  const forecastFor = (item: string) =>
    upcoming.reduce((sum, c) => {
      const size = properties.get(c.listingId)?.sizeCode ?? "";
      return sum + (perClean.get(`${item}|${size}`) ?? 0);
    }, 0);

  const toLine = (tab: StockLine["tab"]) => (r: Row<"Stock_Amenities">): StockLine => {
    const onHand = Number(r.on_hand) || 0;
    const reorderPoint = Number(r.reorder_point) || 0;
    const forecastUse = forecastFor(r.item);
    const projected = onHand - forecastUse;
    return {
      tab,
      id: r.id,
      item: r.item,
      unit: r.unit,
      supplier: r.supplier,
      onHand,
      reorderPoint,
      forecastUse,
      projected,
      trigger: onHand <= reorderPoint || projected <= reorderPoint,
    };
  };

  return [...amenities.map(toLine("Stock_Amenities")), ...linen.map(toLine("Stock_Linen"))];
}
