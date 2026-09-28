import "server-only";
import type { Reservation } from "@/lib/cleans";

const API = "https://api.hostaway.com/v1";

export type Listing = {
  id: number;
  name: string;
  internalListingName?: string | null;
  bedroomsNumber?: number | null;
  bathroomsNumber?: number | null;
  address?: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(`${API}/accessTokens`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-control": "no-cache" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.HOSTAWAY_ACCOUNT_ID!,
      client_secret: process.env.HOSTAWAY_API_KEY!,
      scope: "general",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Hostaway auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** Fetches every page of a Hostaway list endpoint. Cached for 5 minutes to stay inside rate limits. */
async function getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const token = await accessToken();
  const limit = 500;
  const all: T[] = [];

  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });
    const res = await fetch(`${API}${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Hostaway ${path} failed (${res.status})`);
    const data = (await res.json()) as { result: T[]; count?: number };
    all.push(...data.result);
    if (data.result.length < limit) break;
  }
  return all;
}

export function getListings(): Promise<Listing[]> {
  return getAll<Listing>("/listings");
}

/** Reservations whose stay overlaps [from, to] (inclusive, YYYY-MM-DD). */
export async function getReservations(from: string, to: string): Promise<Reservation[]> {
  const rows = await getAll<Reservation>("/reservations", {
    departureStartDate: from,
    arrivalEndDate: to,
  });
  return rows.map((r) => ({
    id: r.id,
    listingMapId: r.listingMapId,
    listingName: r.listingName,
    arrivalDate: r.arrivalDate,
    departureDate: r.departureDate,
    status: r.status,
    guestName: r.guestName,
  }));
}
