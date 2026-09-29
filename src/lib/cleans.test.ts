import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCleans,
  trackCleans,
  findBookingFailures,
  incompleteFromYesterday,
  nowInAuckland,
  midstayNights,
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

test("midstay count is nights ÷ 7 rounded down", () => {
  assert.equal(midstayNights(6).length, 0);
  assert.equal(midstayNights(7).length, 1);
  assert.equal(midstayNights(13).length, 1);
  assert.equal(midstayNights(14).length, 2);
});

test("midstays are spread evenly, rounding up (16 nights → nights 6 and 11, per the API Calculator)", () => {
  assert.deepEqual(midstayNights(16), [
    { night: 6, type: "midstay_topup" },
    { night: 11, type: "midstay_topup" },
  ]);
});

test("100 night stay: 14 midstays, full cleans on nights 27, 54 and 80", () => {
  const plan = midstayNights(100);
  assert.equal(plan.length, 14);
  assert.deepEqual(
    plan.filter((m) => m.type === "midstay_clean").map((m) => m.night),
    [27, 54, 80],
  );
  assert.equal(plan.filter((m) => m.type === "midstay_topup").length, 11);
});

test("midstays become dated cleans on the stay, then the departure clean", () => {
  const jobs = deriveCleans([res({ arrivalDate: "2026-10-01", departureDate: "2026-10-17" })]);
  assert.deepEqual(
    jobs.map((j) => `${j.date} ${j.type}`),
    ["2026-10-07 midstay_topup", "2026-10-12 midstay_topup", "2026-10-17 departure"],
  );
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

test("cancelled long stays don't generate midstays", () => {
  const jobs = deriveCleans([res({ arrivalDate: "2026-10-01", departureDate: "2026-10-20", status: "cancelled" })]);
  assert.deepEqual(jobs.map((j) => `${j.type} ${j.cancelled}`), ["departure true"]);
});

test("missed turnovers older than yesterday aren't reported as failures", () => {
  const jobs = deriveCleans([
    res({ id: 1, arrivalDate: "2026-09-20", departureDate: "2026-09-25" }),
    res({ id: 2, arrivalDate: "2026-09-25", departureDate: "2026-09-27" }),
  ]);
  const tracked = trackCleans(jobs, []);
  assert.equal(findBookingFailures(tracked, { date: "2026-09-29", hour: 9 }).length, 0);
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
