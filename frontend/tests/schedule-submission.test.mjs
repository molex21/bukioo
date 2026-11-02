import assert from "node:assert/strict";
import test from "node:test";
import { submitScheduleChange } from "../src/lib/schedule-submission.ts";

const ok = { ok: true, preview: true, conflicts: [] };
function options(overrides = {}) {
  const calls = [];
  return {
    calls,
    args: {
      preview: async () => {
        calls.push("check");
        return ok;
      },
      save: async () => {
        calls.push("save");
        return { ...ok, preview: false };
      },
      restoring: false,
      onChecked: () => calls.push("shown"),
      onWriting: () => calls.push("writing"),
      ...overrides,
    },
  };
}
test("saving checks the exact draft before attempting any write", async () => {
  const { calls, args } = options();
  assert.equal(await submitScheduleChange(args), "saved");
  assert.deepEqual(calls, ["check", "shown", "writing", "save"]);
});
test("conflicting appointments leave the draft unsaved", async () => {
  const { calls, args } = options({
    preview: async () => ({
      ...ok,
      ok: false,
      conflicts: [{ id: "appointment" }],
    }),
  });
  assert.equal(await submitScheduleChange(args), "conflict");
  assert.deepEqual(calls, ["shown"]);
});
test("a changed restored schedule requires a fresh review", async () => {
  const { calls, args } = options({
    restoring: true,
    reviewedRestoredDay: { spans: [] },
    preview: async () => ({
      ...ok,
      restoredDay: { spans: [{ start: 540, end: 780 }] },
    }),
  });
  assert.equal(await submitScheduleChange(args), "review");
  assert.deepEqual(calls, ["shown"]);
});
test("an unchanged restored schedule can be saved", async () => {
  const restoredDay = {
    origin: "base",
    spans: [],
    attention: [],
    ambiguous: false,
  };
  const { calls, args } = options({
    restoring: true,
    reviewedRestoredDay: restoredDay,
    preview: async () => ({ ...ok, restoredDay: structuredClone(restoredDay) }),
  });
  assert.equal(await submitScheduleChange(args), "saved");
  assert.deepEqual(calls, ["shown", "writing", "save"]);
});
test("a failed check never marks a write as attempted", async () => {
  const { calls, args } = options({
    preview: async () => {
      throw new Error("offline");
    },
  });
  await assert.rejects(submitScheduleChange(args), /offline/);
  assert.deepEqual(calls, []);
});
test("a write conflict is propagated without automatically retrying", async () => {
  let writes = 0;
  const { calls, args } = options({
    save: async () => {
      writes++;
      throw new Error("version changed");
    },
  });
  await assert.rejects(submitScheduleChange(args), /version changed/);
  assert.equal(writes, 1);
  assert.deepEqual(calls, ["check", "shown", "writing"]);
});
