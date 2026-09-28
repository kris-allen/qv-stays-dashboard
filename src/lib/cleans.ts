/**
 * Turns Hostaway reservations into cleaning jobs and applies the ops rules from
 * the dashboard brief. Pure functions only, so every rule is unit tested.
 * Dates are plain "YYYY-MM-DD" strings in the Auckland timezone throughout.
 */

export type Reservation = {
  id: number | string;
  listingMapId: number | string;
  listingName?: string;
  arrivalDate: string;
  departureDate: string;
  /** Hostaway status, e.g. "new", "modified", "cancelled", "ownerStay". */
  status: string;
  guestName?: string;
};

export type CleanType = "departure" | "owner_departure" | "midstay_topup" | "midstay_clean";

export type CleanJob = {
  key: string;
  listingId: string;
  listingName: string;
  date: string;
  type: CleanType;
  reservationId: string;
  /** Same day turnover: another guest checks in on the same day as this departure. */
  sdt: boolean;
  /** The reservation behind this job was cancelled. */
  cancelled: boolean;
};

/** A row from the Cleans tab: the part Hostaway doesn't know about. */
export type CleanRecord = {
  key: string;
  se: string;
  status: string;
  completedAt: string;
};

export type TrackedClean = CleanJob & {
  se: string | null;
  completed: boolean;
  completedAt: string | null;
};

export type MidstayRule = {
  /** A top up every N nights of a stay (0 disables). */
  topUpEveryNights: number;
  /** A full midstay clean every N nights (0 disables). Takes priority over a top up on the same night. */
  cleanEveryNights: number;
};

// Placeholder until Kris confirms the real rule.
export const DEFAULT_MIDSTAY_RULE: MidstayRule = { topUpEveryNights: 3, cleanEveryNights: 7 };

const CANCELLED_STATUSES = new Set(["cancelled", "declined", "expired"]);
const IGNORED_STATUSES = new Set(["inquiry", "inquiryPreapproved", "inquiryDenied", "inquiryTimeout", "inquiryNotPossible"]);

export function isOwnerStay(r: Reservation): boolean {
  return r.status === "ownerStay";
}

export function cleanKey(listingId: string, date: string, type: CleanType): string {
  return `${listingId}:${date}:${type}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(arrival: string, departure: string): number {
  return Math.round(
    (Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`)) / 86_400_000,
  );
}

export function deriveCleans(reservations: Reservation[], rule: MidstayRule = DEFAULT_MIDSTAY_RULE): CleanJob[] {
  const relevant = reservations.filter((r) => !IGNORED_STATUSES.has(r.status));

  // Active arrivals by listing and date, for spotting same day turnovers.
  const arrivals = new Set(
    relevant
      .filter((r) => !CANCELLED_STATUSES.has(r.status))
      .map((r) => `${r.listingMapId}:${r.arrivalDate}`),
  );

  const jobs: CleanJob[] = [];
  for (const r of relevant) {
    const listingId = String(r.listingMapId);
    const listingName = r.listingName ?? listingId;
    const cancelled = CANCELLED_STATUSES.has(r.status);
    const base = { listingId, listingName, reservationId: String(r.id), cancelled };

    const departureType: CleanType = isOwnerStay(r) ? "owner_departure" : "departure";
    jobs.push({
      ...base,
      key: cleanKey(listingId, r.departureDate, departureType),
      date: r.departureDate,
      type: departureType,
      sdt: !cancelled && arrivals.has(`${listingId}:${r.departureDate}`),
    });

    if (isOwnerStay(r)) continue;

    const nights = nightsBetween(r.arrivalDate, r.departureDate);
    for (let night = 1; night < nights; night++) {
      const type = midstayTypeForNight(night, rule);
      if (!type) continue;
      const date = addDays(r.arrivalDate, night);
      jobs.push({ ...base, key: cleanKey(listingId, date, type), date, type, sdt: false });
    }
  }

  return jobs.sort((a, b) => a.date.localeCompare(b.date) || a.listingName.localeCompare(b.listingName));
}

function midstayTypeForNight(night: number, rule: MidstayRule): CleanType | null {
  if (rule.cleanEveryNights > 0 && night % rule.cleanEveryNights === 0) return "midstay_clean";
  if (rule.topUpEveryNights > 0 && night % rule.topUpEveryNights === 0) return "midstay_topup";
  return null;
}

export function trackCleans(jobs: CleanJob[], records: CleanRecord[]): TrackedClean[] {
  const byKey = new Map(records.map((r) => [r.key, r]));
  return jobs.map((job) => {
    const record = byKey.get(job.key);
    const completed = record?.status.toLowerCase() === "completed";
    return {
      ...job,
      se: record?.se?.trim() || null,
      completed,
      completedAt: completed ? record?.completedAt || null : null,
    };
  });
}

export type BookingFailure = {
  clean: TrackedClean;
  reason: "unassigned" | "not_ready_for_check_in";
};

/**
 * A booking failure is either a departure clean due by tomorrow with no SE
 * assigned, or a same day turnover whose clean still isn't done once the
 * next guest's check in time has passed.
 */
export function findBookingFailures(
  cleans: TrackedClean[],
  now: { date: string; hour: number },
  checkInHour = 15,
): BookingFailure[] {
  const tomorrow = addDays(now.date, 1);
  const failures: BookingFailure[] = [];

  for (const clean of cleans) {
    if (clean.cancelled || clean.completed) continue;
    const isDeparture = clean.type === "departure" || clean.type === "owner_departure";

    if (clean.sdt && (clean.date < now.date || (clean.date === now.date && now.hour >= checkInHour))) {
      failures.push({ clean, reason: "not_ready_for_check_in" });
    } else if (isDeparture && !clean.se && clean.date >= now.date && clean.date <= tomorrow) {
      failures.push({ clean, reason: "unassigned" });
    }
  }
  return failures;
}

export function incompleteFromYesterday(cleans: TrackedClean[], today: string): TrackedClean[] {
  const yesterday = addDays(today, -1);
  return cleans.filter((c) => c.date === yesterday && !c.cancelled && !c.completed);
}

/** Today's date and hour in Auckland, regardless of the server's timezone. */
export function nowInAuckland(at: Date = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}
