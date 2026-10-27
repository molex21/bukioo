import { date, pattern, spans } from "./scheduling-domain";
const empty = () => Array.from({ length: 7 }, () => [] as unknown[]);
describe("Scheduling domain", () => {
  it("keeps an explicit rest day", () => {
    expect(spans([])).toEqual([]);
  });
  it("accepts split shifts and a contained pause", () => {
    expect(
      spans([
        { start: 540, end: 780, pauses: [{ start: 600, end: 615 }] },
        { start: 960, end: 1200 },
      ]),
    ).toHaveLength(2);
  });
  it("rejects pauses outside presence and overlapping shifts", () => {
    expect(() =>
      spans([{ start: 540, end: 780, pauses: [{ start: 500, end: 600 }] }]),
    ).toThrow();
    expect(() =>
      spans([
        { start: 540, end: 780 },
        { start: 700, end: 800 },
      ]),
    ).toThrow();
  });
  it("checks night spill from Sunday into the next cycle Monday", () => {
    const a = empty(),
      b = empty();
    a[0] = [{ start: 1380, end: 1560 }];
    b[1] = [{ start: 60, end: 180 }];
    expect(() => pattern([a, b])).toThrow();
  });
  it("supports 12 weeks but not an unbounded cycle", () => {
    expect(pattern(Array.from({ length: 12 }, empty))).toHaveLength(12);
    expect(() => pattern(Array.from({ length: 13 }, empty))).toThrow();
  });
  it("rejects invalid dates rather than normalizing them", () => {
    expect(date("2028-02-29")).toBe("2028-02-29");
    expect(() => date("2027-02-29")).toThrow();
  });
});
