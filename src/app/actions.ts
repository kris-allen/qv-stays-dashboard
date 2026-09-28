"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { appendRow, readTab, updateRow } from "@/lib/sheets";
import { ISSUE_TABS, type IssueTab } from "@/lib/sheet-schema";
import { nowInAuckland } from "@/lib/cleans";
import { getCleans, getProperties } from "@/lib/data";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const timestamp = () => new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });

/** Creates or updates the Cleans row for a derived clean (keyed by clean_key). */
async function upsertClean(cleanKey: string, patch: { se?: string; status?: string; completed_at?: string; notes?: string }) {
  const rows = await readTab("Cleans");
  const existing = rows.find((r) => r.clean_key === cleanKey);
  if (existing) {
    await updateRow("Cleans", existing.id, patch);
    return;
  }
  const [listingId, date, type] = cleanKey.split(":");
  const property = (await getProperties()).get(listingId)?.name ?? listingId;
  await appendRow("Cleans", { clean_key: cleanKey, listing_id: listingId, property, date, type, status: "assigned", ...patch });
}

export async function assignSe(form: FormData) {
  await requireRole("nex");
  const se = field(form, "se");
  await upsertClean(field(form, "clean_key"), { se, status: se ? "assigned" : "unassigned" });
  revalidatePath("/nex", "layout");
}

export async function completeClean(form: FormData) {
  const user = await requireRole("nex", "se");
  const cleanKey = field(form, "clean_key");

  if (user.role === "se") {
    // SEs may only complete cleans assigned to them.
    const [, date] = cleanKey.split(":");
    const clean = (await getCleans(date, date)).find((c) => c.key === cleanKey);
    if (!clean || clean.se !== user.seName) throw new Error("This clean isn't assigned to you.");
  }

  await upsertClean(cleanKey, { status: "completed", completed_at: timestamp(), notes: field(form, "notes") || undefined });
  revalidatePath("/", "layout");
}

export async function logIssue(form: FormData) {
  const user = await requireRole("nex", "se");
  const kind = field(form, "kind") as IssueTab;
  if (!ISSUE_TABS.includes(kind)) throw new Error("Unknown issue type.");

  const common = {
    date: nowInAuckland().date,
    property: field(form, "property"),
    reported_by: user.seName ?? user.email,
    photo_link: field(form, "photo_link"),
    status: "open",
  };
  const text = field(form, "description");

  if (kind === "Lost_Found") await appendRow(kind, { ...common, item: text, status: "stored" });
  else if (kind === "Quality_Issues") await appendRow(kind, { ...common, description: text, se: user.seName ?? "" });
  else await appendRow(kind, { ...common, description: text });

  revalidatePath("/", "layout");
}

export async function setIssueStatus(form: FormData) {
  await requireRole("nex");
  const kind = field(form, "kind") as IssueTab;
  if (!ISSUE_TABS.includes(kind)) throw new Error("Unknown issue type.");
  const status = field(form, "status");
  const closed = ["resolved", "returned", "closed"].includes(status);
  const closedAt = kind === "Lost_Found" ? { returned_at: closed ? timestamp() : "" } : { resolved_at: closed ? timestamp() : "" };
  await updateRow(kind, field(form, "id"), { status, ...closedAt });
  revalidatePath("/", "layout");
}

export async function setUpgradeStatus(form: FormData) {
  const user = await requireRole("nex");
  const status = field(form, "status");
  await updateRow("Upgrades", field(form, "id"), { status, approved_by: status === "approved" ? user.email : "" });
  revalidatePath("/nex", "layout");
}

export async function requestUpgrade(form: FormData) {
  const user = await requireRole("nex", "se");
  await appendRow("Upgrades", {
    date: nowInAuckland().date,
    property: field(form, "property"),
    requested_by: user.seName ?? user.email,
    description: field(form, "description"),
    photo_link: field(form, "photo_link"),
    status: "requested",
  });
  revalidatePath("/", "layout");
}

async function upsertOwnerInvoice(cleanKey: string, patch: Record<string, string>) {
  const rows = await readTab("Owner_Departure_Invoices");
  const existing = rows.find((r) => r.clean_key === cleanKey);
  if (existing) return updateRow("Owner_Departure_Invoices", existing.id, patch);
  const [listingId, date] = cleanKey.split(":");
  const property = (await getProperties()).get(listingId)?.name ?? listingId;
  return appendRow("Owner_Departure_Invoices", { clean_key: cleanKey, property, clean_date: date, ...patch });
}

export async function markOwnerInvoiceSent(form: FormData) {
  await requireRole("nex");
  await upsertOwnerInvoice(field(form, "clean_key"), { invoice_sent: "yes", amount: field(form, "amount") });
  revalidatePath("/", "layout");
}

export async function confirmOwnerInvoice(form: FormData) {
  const user = await requireRole("client", "nex");
  const cleanKey = field(form, "clean_key");
  if (user.role === "client") {
    const [listingId] = cleanKey.split(":");
    const property = (await getProperties()).get(listingId);
    if (!property || property.clientOrg !== user.clientOrg) throw new Error("Not one of your properties.");
  }
  await upsertOwnerInvoice(cleanKey, { confirmed: "yes", confirmed_by: user.email });
  revalidatePath("/", "layout");
}

export async function updateStock(form: FormData) {
  await requireRole("nex");
  const tab = field(form, "tab");
  if (tab !== "Stock_Amenities" && tab !== "Stock_Linen") throw new Error("Unknown stock tab.");
  await updateRow(tab, field(form, "id"), { on_hand: field(form, "on_hand"), updated_at: timestamp() });
  revalidatePath("/nex", "layout");
}
