/**
 * The Google Sheet is the database. Every tab and its header row is defined
 * here once; the setup script creates tabs from this, and the app reads and
 * writes by these header names. Every tab starts with an `id` column so a row
 * can be updated safely even if someone reorders the sheet.
 */
export const TABS = {
  Properties: ["id", "listing_id", "name", "size_code", "client_org", "address", "active"],
  Cleans: ["id", "clean_key", "listing_id", "property", "date", "type", "se", "status", "completed_at", "notes"],
  SE_Roster: ["id", "se_name", "company", "email", "phone", "active", "roster_days"],
  Upgrades: ["id", "date", "property", "requested_by", "description", "photo_link", "status", "approved_by"],
  Owner_Departure_Invoices: ["id", "clean_key", "property", "owner", "clean_date", "amount", "invoice_sent", "confirmed", "confirmed_by"],
  Stock_Amenities: ["id", "item", "unit", "on_hand", "reorder_point", "reorder_qty", "supplier", "updated_at"],
  Stock_Linen: ["id", "item", "unit", "on_hand", "reorder_point", "reorder_qty", "supplier", "updated_at"],
  Stock_Usage: ["id", "item", "size_code", "units_per_clean"],
  Stock_Orders: ["id", "date", "supplier", "item", "quantity", "status", "expected_delivery"],
  Maintenance: ["id", "date", "property", "reported_by", "description", "photo_link", "priority", "status", "resolved_at"],
  Quality_Issues: ["id", "date", "property", "reported_by", "description", "photo_link", "se", "status", "resolved_at"],
  Lost_Found: ["id", "date", "property", "reported_by", "item", "photo_link", "stored_at", "status", "returned_at"],
  Damages: ["id", "date", "property", "reported_by", "description", "photo_link", "estimated_cost", "status", "resolved_at"],
} as const satisfies Record<string, readonly string[]>;

export type TabName = keyof typeof TABS;
export type Row<T extends TabName> = Record<(typeof TABS)[T][number], string>;

export const ISSUE_TABS = ["Maintenance", "Quality_Issues", "Lost_Found", "Damages"] as const;
export type IssueTab = (typeof ISSUE_TABS)[number];

export const ISSUE_LABELS: Record<IssueTab, string> = {
  Maintenance: "Maintenance request",
  Quality_Issues: "Quality issue",
  Lost_Found: "Lost and found",
  Damages: "Damage",
};

/** Statuses that count as closed for any issue style tab. */
export const CLOSED_STATUSES = new Set(["resolved", "closed", "returned", "done", "completed"]);
