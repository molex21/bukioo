import test from "node:test";
import assert from "node:assert/strict";
import {
  nominalMinutes,
  totalNominalMinutes,
  formatWorkMinutes,
  replaceSelectedDays,
  commonDaySpans,
  rotationRangePreview,
} from "../src/lib/schedule-editor.ts";
const shift = (countsAsWork) => [
  {
    start: 540,
    end: 1020,
    pauses: [
      {
        start: 720,
        end: 750,
        ...(countsAsWork === undefined ? {} : { countsAsWork }),
      },
    ],
  },
];
test("only non-computable pauses reduce estimated hours", () => {
  assert.equal(nominalMinutes(shift(undefined)), 450);
  assert.equal(nominalMinutes(shift(false)), 450);
  assert.equal(nominalMinutes(shift(true)), 480);
  const mixed = shift(true);
  mixed[0].pauses.push({ start: 800, end: 815, countsAsWork: false });
  assert.equal(nominalMinutes(mixed), 465);
});
test("invalid drafts never produce negative totals or NaN", () => {
  assert.equal(nominalMinutes([{ start: 600, end: 540, pauses: [] }]), null);
  assert.equal(
    nominalMinutes([
      { start: 540, end: 780, pauses: [{ start: 500, end: 600 }] },
    ]),
    null,
  );
  assert.equal(formatWorkMinutes(NaN), "Revisa los turnos");
  assert.equal(formatWorkMinutes(450), "7 h 30 min");
});
test("applying a shift replaces only selected days with independent copies", () => {
  const days = [
    { id: "1", label: "Lunes", spans: [] },
    { id: "2", label: "Martes", spans: [] },
    { id: "3", label: "Miércoles", spans: [] },
  ];
  const input = shift(true),
    result = replaceSelectedDays(days, ["1", "3"], input);
  assert.equal(result[1], days[1]);
  assert.deepEqual(days[0].spans, []);
  result[0].spans[0].pauses[0].countsAsWork = false;
  assert.equal(result[2].spans[0].pauses[0].countsAsWork, true);
  assert.equal(input[0].pauses[0].countsAsWork, true);
});
test("heterogeneous selection has no implicit common shift", () => {
  const days = [
    { id: "1", label: "Lunes", spans: shift(true) },
    { id: "2", label: "Martes", spans: shift(false) },
  ];
  assert.equal(commonDaySpans(days, ["1", "2"]), null);
  assert.deepEqual(commonDaySpans(days, ["1"]), shift(true));
  assert.deepEqual(
    commonDaySpans(
      [
        { id: "1", label: "Lunes", spans: shift(undefined) },
        { id: "2", label: "Martes", spans: shift(false) },
      ],
      ["1", "2"],
    ),
    shift(undefined),
  );
});
test("overnight shifts and cycle totals include paid pauses", () => {
  const spans = [
    {
      start: 1320,
      end: 1560,
      pauses: [
        { start: 1410, end: 1455, countsAsWork: true },
        { start: 1500, end: 1515 },
      ],
    },
  ];
  assert.equal(nominalMinutes(spans), 225);
  assert.equal(totalNominalMinutes([spans, shift(false)]), 675);
});
test("rotation range respects phase and partial weeks", () => {
  const a = Array.from({ length: 7 }, () => []),
    b = Array.from({ length: 7 }, () => []);
  a[1] = shift(true);
  b[1] = shift(false);
  const result = rotationRangePreview([a, b], "2030-01-07", "2030-01-20", 1);
  assert.equal(result.totalMinutes, 930);
  assert.equal(result.days[0].week, 1);
  assert.equal(result.days[7].week, 0);
  assert.equal(
    rotationRangePreview([a, b], "2030-01-08", "2030-01-08").totalMinutes,
    0,
  );
  assert.equal(rotationRangePreview([a, b], "2030-01-20", "2030-01-07"), null);
});
test("night work is clipped at the inclusive rotation end", () => {
  const a = Array.from({ length: 7 }, () => []);
  a[1] = [{ start: 1320, end: 1560, pauses: [{ start: 1410, end: 1470 }] }];
  const result = rotationRangePreview([a], "2030-01-07", "2030-01-07");
  assert.equal(result.totalMinutes, 90);
  assert.equal(result.days[0].spans[0].end, 1440);
});
test("long-range nominal total covers the entire interval with a bounded detail", () => {
  const a = Array.from({ length: 7 }, () => []);
  a[1] = shift(true);
  const result = rotationRangePreview([a], "2030-01-07", "2030-12-31");
  assert.equal(result.totalMinutes, 52 * 480);
  assert.equal(result.truncated, true);
  assert.equal(result.days.length, 42);
});
