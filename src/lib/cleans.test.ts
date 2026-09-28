import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCleans,
  trackCleans,
  findBookingFailures,
  incompleteFromYesterday,
  nowInAuckland,
  type Reservation,
} from "./cleans";

const res = (over: Partial<Reservation>): Reservation => ({
  id: 1,
  listingMapId: 100,
  listingName: "Her 802",
  arrivalDate: "2026-10-01",
  departureDate: "2026-10-03",
  status: "new",
  ...over,
});

test("departure clean on checkout date", () => {
  const jobs = deriveCleans([res({})]);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].type, "departure");
  assert.equal(jobs[0].date, "2026-10-03");
  assert.equal(jobs[0].key, "100:2026-10-03:departure");
  assert.equal(jobs[0].sdt, false);
});

test("same day turnover when the next guest arrives on the departure date", () => {
  const jobs = deriveCleans([
    res({ id: 1 }),
    res({ id: 2, arrivalDate: "2026-10-03", departureDate: "2026-10-05" }),
  ]);
  const first = jobs.find((j) => j.reservationId === "1")!;
  assert.equal(first.sdt, true);
});

test("a cancelled incoming booking does not make an SDT, and a cancelled stay flags its clean", () => {
  const jobs = deriveCleans([
    res({ id: 1 }),
    res({ id: 2, arrivalDate: "2026-10-03", departureDate: "2026-10-05", status: "cancelled" }),
  ]);
  assert.equal(jobs.find((j) => j.reservationId === "1")!.sdt, false);
  assert.equal(jobs.find((j) => j.reservationId === "2")!.cancelled, true);
});

test("owner stays produce an owner departure clean and no midstays", () => {
  const jobs = deriveCleans([
    res({ status: "ownerStay", arrivalDate: "2026-10-01", departureDate: "2026-10-12" }),
  ]);
  assert.deepEqual(jobs.map((j) => j.type), ["owner_departure"]);
});

test("midstays follow the rule, full clean wins over a top up on the same night", () => {
  const jobs = deriveCleans(
    [res({ arrivalDate: "2026-10-01", departureDate: "2026-10-15" })],
    { topUpEveryNights: 3, cleanEveryNights: 7 },
  );
  const mid = jobs.filter((j) => j.type !== "departure").map((j) => `${j.date} ${j.type}`);
  assert.deepEqual(mid, [
    "2026-10-04 midstay_topup",
    "2026-10-07 midstay_topup",
    "2026-10-08 midstay_clean",
    "2026-10-10 midstay_topup",
    "2026-10-13 midstay_topup",
  ]);
});

test("inquiries are ignored", () => {
  assert.equal(deriveCleans([res({ status: "inquiry" })]).length, 0);
});

test("booking failures: unassigned departure due tomorrow, and SDT not done after check in time", () => {
  const jobs = deriveCleans([
    res({ id: 1, listingMapId: 100, arrivalDate: "2026-09-28", departureDate: "2026-09-30" }),
    res({ id: 2, listingMapId: 200, arrivalDate: "2026-09-27", departureDate: "2026-09-29" }),
    res({ id: 3, listingMapId: 200, arrivalDate: "2026-09-29", departureDate: "2026-10-02" }),
  ]);
  const tracked = trackCleans(jobs, [
    { key: "200:2026-09-29:departure", se: "Sumit", status: "assigned", completedAt: "" },
  ]);

  const morning = findBookingFailures(tracked, { date: "2026-09-29", hour: 9 });
  assert.deepEqual(
    morning.map((f) => `${f.clean.key} ${f.reason}`),
    ["100:2026-09-30:departure unassigned"],
  );

  const afternoon = findBookingFailures(tracked, { date: "2026-09-29", hour: 16 });
  assert.ok(afternoon.some((f) => f.clean.key === "200:2026-09-29:departure" && f.reason === "not_ready_for_check_in"));
});

test("completed cleans are never failures", () => {
  const jobs = deriveCleans([res({ departureDate: "2026-09-30", arrivalDate: "2026-09-28" })]);
  const tracked = trackCleans(jobs, [
    { key: "100:2026-09-30:departure", se: "Sumit", status: "Completed", completedAt: "2026-09-30T11:00" },
  ]);
  assert.equal(findBookingFailures(tracked, { date: "2026-09-29", hour: 9 }).length, 0);
});

test("incomplete tasks from yesterday", () => {
  const jobs = deriveCleans([res({ arrivalDate: "2026-09-26", departureDate: "2026-09-28" })]);
  const tracked = trackCleans(jobs, []);
  assert.equal(incompleteFromYesterday(tracked, "2026-09-29").length, 1);
  assert.equal(incompleteFromYesterday(tracked, "2026-09-30").length, 0);
});

test("Auckland date is used regardless of server timezone", () => {
  // 2026-09-29 20:00 UTC is 2026-09-30 09:00 in Auckland (NZDT, UTC+13).
  assert.deepEqual(nowInAuckland(new Date("2026-09-29T20:00:00Z")), { date: "2026-09-30", hour: 9 });
});
