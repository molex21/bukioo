import assert from "node:assert/strict";
import test from "node:test";
import {
  dateInZone,
  weekDates,
  blockTouchesDate,
  blockTimeLabel,
  hoursOnDate,
} from "../src/lib/team-quadrant.ts";

test("week navigation handles Sunday and year boundaries", () => {
  assert.deepEqual(weekDates("2027-01-03"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.equal(weekDates("2027-01-03", 1)[0], "2027-01-04");
});
test("today follows the business timezone", () => {
  const now = new Date("2026-10-27T23:30:00Z");
  assert.equal(dateInZone(now, "Atlantic/Canary"), "2026-10-27");
  assert.equal(dateInZone(now, "Europe/Madrid"), "2026-10-28");
});
test("midnight end is exclusive across the Madrid autumn DST change", () => {
  const block = {
    id: "b",
    employee_id: "e",
    type: "VACATION",
    start_at: "2026-10-24T22:00:00Z",
    end_at: "2026-10-25T23:00:00Z",
  };
  assert.equal(blockTouchesDate(block, "2026-10-25", "Europe/Madrid"), true);
  assert.equal(blockTouchesDate(block, "2026-10-26", "Europe/Madrid"), false);
  assert.equal(
    blockTimeLabel(block, "2026-10-25", "Europe/Madrid"),
    "Todo el día",
  );
});
test("an overnight break appears on both local days", () => {
  const block = {
    id: "b",
    employee_id: null,
    type: "BREAK",
    start_at: "2026-10-27T22:30:00Z",
    end_at: "2026-10-28T00:30:00Z",
  };
  assert.equal(blockTouchesDate(block, "2026-10-27", "Europe/Madrid"), true);
  assert.equal(blockTouchesDate(block, "2026-10-28", "Europe/Madrid"), true);
  assert.equal(
    blockTimeLabel(block, "2026-10-27", "Europe/Madrid"),
    "23:30–24:00",
  );
});
test("split shifts respect inclusive validity and calendar weekday", () => {
  const morning = {
    day_of_week: 1,
    start_time: "09:00:00",
    end_time: "13:00:00",
    valid_from: "2026-10-26",
    valid_to: "2026-10-26",
  };
  const evening = { ...morning, start_time: "16:00:00", end_time: "20:00:00" };
  assert.deepEqual(hoursOnDate([evening, morning], "2026-10-26"), [
    morning,
    evening,
  ]);
  assert.deepEqual(hoursOnDate([morning], "2026-11-02"), []);
});
