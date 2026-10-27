import test from "node:test";
import assert from "node:assert/strict";
import {
  employeeColorContrast,
  improvedEmployeeColor,
} from "../src/lib/employee-color.ts";
test("light colors warn on light surfaces and correction improves contrast", () => {
  assert.ok(employeeColorContrast("#ffffff", false) < 4.5);
  assert.ok(
    employeeColorContrast(improvedEmployeeColor("#ffffff", false), false) >=
      4.5,
  );
});
test("dark colors on dark surfaces can be improved explicitly", () => {
  assert.ok(employeeColorContrast("#000000", true) < 4.5);
  assert.ok(
    employeeColorContrast(improvedEmployeeColor("#000000", true), true) >= 4.5,
  );
});
test("invalid draft colors are not silently replaced", () => {
  assert.equal(employeeColorContrast("#ff", false), null);
  assert.equal(improvedEmployeeColor("#ff", false), "#ff");
});
