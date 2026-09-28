import type { CleanType } from "@/lib/cleans";

export const CLEAN_TYPE_LABELS: Record<CleanType, string> = {
  departure: "Departure clean",
  owner_departure: "Owner departure",
  midstay_topup: "Midstay top up",
  midstay_clean: "Midstay clean",
};

export function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
