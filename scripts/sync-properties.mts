/**
 * Adds every Hostaway listing that isn't on the Properties tab yet, with its
 * internal name and size code worked out from bedrooms and bathrooms. Existing
 * rows (including any client_org you've filled in) are never touched, so it's
 * safe to rerun whenever a new property is onboarded.
 *
 *   npx tsx --env-file=.env.local scripts/sync-properties.mts
 */
import { google } from "googleapis";
import { TABS } from "../src/lib/sheet-schema.ts";

const API = "https://api.hostaway.com/v1";

const tokenRes = await fetch(`${API}/accessTokens`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.HOSTAWAY_ACCOUNT_ID!,
    client_secret: process.env.HOSTAWAY_API_KEY!,
    scope: "general",
  }),
});
const { access_token } = await tokenRes.json();
const listingsRes = await fetch(`${API}/listings?limit=500`, { headers: { Authorization: `Bearer ${access_token}` } });
const listings: {
  id: number;
  name: string;
  internalListingName?: string;
  bedroomsNumber?: number;
  bathroomsNumber?: number;
  address?: string;
}[] = (await listingsRes.json()).result;

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Properties!A1:Z" });
const [header = [], ...rows] = (existing.data.values ?? []) as string[][];
const listingCol = header.indexOf("listing_id");
const known = new Set(rows.map((r) => r[listingCol]));

const sizeCode = (bed?: number, bath?: number) =>
  bed === 0 ? "STUDIO" : bed != null && bath != null ? `${bed}B${bath}B` : "";

const newRows = listings
  .filter((l) => !known.has(String(l.id)))
  .map((l) => {
    const values: Record<string, string> = {
      id: crypto.randomUUID(),
      listing_id: String(l.id),
      name: l.internalListingName || l.name,
      size_code: sizeCode(l.bedroomsNumber, l.bathroomsNumber),
      client_org: "",
      address: l.address ?? "",
      active: "yes",
    };
    return TABS.Properties.map((col) => values[col] ?? "");
  });

if (newRows.length) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Properties!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: newRows },
  });
}
console.log(`${listings.length} Hostaway listings, ${newRows.length} added to Properties.`);
