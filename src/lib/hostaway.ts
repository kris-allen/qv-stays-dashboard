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

/** Fetches every page of a Hostaway list endpoint. */
async function getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const token = await accessToken();
  const limit = 500;
  const all: T[] = [];

  for (let offset = 0; ; offset += limit) {
    const query = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });
    // Raw pages run to several MB, past Next's 2 MB fetch cache limit, so the
    // trimmed result is cached in memory instead (see `memo`).
    const res = await fetch(`${API}${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, "Cache-control": "no-cache" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Hostaway ${path} failed (${res.status})`);
    const data = (await res.json()) as { result: T[]; count?: number };
    all.push(...data.result);
    if (data.result.length < limit) break;
  }
  return all;
}

const memoStore = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

/** Shares one in-flight or recent result per key for `ttlMs`; failures aren't kept. */
function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memoStore.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
  const value = load();
  memoStore.set(key, { expiresAt: Date.now() + ttlMs, value });
  value.catch(() => memoStore.delete(key));
  return value;
}

// Listings barely change and are the heaviest call (~8 MB), so they're kept longer.
export function getListings(): Promise<Listing[]> {
  return memo("listings", 60 * 60_000, async () =>
    (await getAll<Listing>("/listings")).map((l) => ({
      id: l.id,
      name: l.name,
      internalListingName: l.internalListingName,
      bedroomsNumber: l.bedroomsNumber,
      bathroomsNumber: l.bathroomsNumber,
      address: l.address,
    })),
  );
}

/** Reservations whose stay overlaps [from, to] (inclusive, YYYY-MM-DD). */
export function getReservations(from: string, to: string): Promise<Reservation[]> {
  return memo(`reservations:${from}:${to}`, 5 * 60_000, async () =>
    (await getAll<Reservation>("/reservations", { departureStartDate: from, arrivalEndDate: to })).map((r) => ({
      id: r.id,
      listingMapId: r.listingMapId,
      listingName: r.listingName,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      status: r.status,
      guestName: r.guestName,
    })),
  );
}
