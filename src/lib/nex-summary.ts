import "server-only";
import { addDays, findBookingFailures, incompleteFromYesterday } from "@/lib/cleans";
import { getIssues, getWindow } from "@/lib/data";
import { readTab } from "@/lib/sheets";

const UPGRADE_DONE = new Set(["approved", "declined", "done", "completed"]);

export async function getNexOperations() {
  const { now, cleans } = await getWindow();
  const tomorrow = addDays(now.date, 1);
  const weekAhead = addDays(now.date, 7);
  const active = cleans.filter((c) => !c.cancelled);
  const upcoming = (c: { date: string }) => c.date >= now.date && c.date <= weekAhead;

  const [upgrades, invoices, roster] = await Promise.all([
    readTab("Upgrades"),
    readTab("Owner_Departure_Invoices"),
    readTab("SE_Roster"),
  ]);
  const invoiceByKey = new Map(invoices.map((i) => [i.clean_key, i]));

  return {
    now,
    nextDay: active.filter((c) => c.date === tomorrow),
    sdt: active.filter((c) => c.sdt && upcoming(c)),
    midstayTopups: active.filter((c) => c.type === "midstay_topup" && upcoming(c)),
    midstayCleans: active.filter((c) => c.type === "midstay_clean" && upcoming(c)),
    cancelled: cleans.filter((c) => c.cancelled && c.date >= now.date),
    failures: findBookingFailures(cleans, now),
    incomplete: incompleteFromYesterday(cleans, now.date),
    openUpgrades: upgrades.filter((u) => !UPGRADE_DONE.has(u.status.trim().toLowerCase())),
    upgrades,
    ownerDepartures: active
      .filter((c) => c.type === "owner_departure" && c.date <= tomorrow)
      .map((c) => ({ clean: c, invoice: invoiceByKey.get(c.key) ?? null })),
    seNames: roster.filter((r) => r.active.toLowerCase() !== "no" && r.se_name).map((r) => r.se_name),
  };
}

export async function getOpenIssueCounts() {
  const issues = await getIssues();
  const open = issues.filter((i) => i.open);
  return {
    maintenance: open.filter((i) => i.kind === "Maintenance").length,
    quality: open.filter((i) => i.kind === "Quality_Issues").length,
    lostFound: open.filter((i) => i.kind === "Lost_Found").length,
    damages: open.filter((i) => i.kind === "Damages").length,
  };
}
