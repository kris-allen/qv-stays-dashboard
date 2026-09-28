/**
 * Makes sure every tab in the schema exists in the Google Sheet with the right
 * header row. Safe to run again: existing tabs and their data are left alone,
 * only missing tabs or missing header rows are added.
 *
 *   npx tsx --env-file=.env.local scripts/setup-sheet.ts
 */
import { google } from "googleapis";
import { TABS } from "../src/lib/sheet-schema";

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);

const missing = Object.keys(TABS).filter((tab) => !existing.has(tab));
if (missing.length) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
      })),
    },
  });
  console.log("Added tabs:", missing.join(", "));
}

for (const [tab, headers] of Object.entries(TABS)) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
  if (res.data.values?.[0]?.length) continue;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [[...headers]] },
  });
  console.log(`Wrote headers for ${tab}`);
}

console.log("Sheet is ready.");
