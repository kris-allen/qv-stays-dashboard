import "server-only";
import { cache } from "react";
import { google, type sheets_v4 } from "googleapis";
import { TABS, type Row, type TabName } from "@/lib/sheet-schema";

let client: sheets_v4.Sheets | null = null;

function sheets(): sheets_v4.Sheets {
  if (client) return client;
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Vercel stores the key with literal "\n"; restore real newlines.
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

const spreadsheetId = () => process.env.GOOGLE_SHEET_ID!;

/** Every tab in one API call, once per request; each tab is a separate round trip otherwise. */
const readAllTabs = cache(async (): Promise<Map<string, string[][]>> => {
  const tabs = Object.keys(TABS);
  const res = await sheets().spreadsheets.values.batchGet({
    spreadsheetId: spreadsheetId(),
    ranges: tabs.map((tab) => `${tab}!A1:Z`),
  });
  return new Map(tabs.map((tab, i) => [tab, (res.data.valueRanges?.[i]?.values ?? []) as string[][]]));
});

/** Reads a whole tab as header keyed rows. */
export async function readTab<T extends TabName>(tab: T): Promise<Row<T>[]> {
  const [header = [], ...rows] = (await readAllTabs()).get(tab) ?? [];
  return rows
    .filter((r) => r.some((cell) => String(cell ?? "").trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, String(r[i] ?? "")])) as Row<T>);
}

export async function appendRow<T extends TabName>(tab: T, values: Partial<Row<T>>): Promise<string> {
  const id = (values as Record<string, string>).id || crypto.randomUUID();
  const row = TABS[tab].map((col) => (col === "id" ? id : ((values as Record<string, string>)[col] ?? "")));
  await sheets().spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
  return id;
}

/** Updates the given columns on the row whose `id` matches. Returns false if no such row. */
export async function updateRow<T extends TabName>(tab: T, id: string, patch: Partial<Row<T>>): Promise<boolean> {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1:Z`,
  });
  const [header = [], ...rows] = (res.data.values ?? []) as string[][];
  const idCol = header.indexOf("id");
  const index = rows.findIndex((r) => r[idCol] === id);
  if (index === -1) return false;

  const current = header.map((_, i) => String(rows[index][i] ?? ""));
  const next = header.map((h, i) => ((patch as Record<string, string>)[h] ?? current[i]));
  const rowNumber = index + 2; // +1 for the header row, +1 because Sheets is 1 indexed
  await sheets().spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [next] },
  });
  return true;
}
