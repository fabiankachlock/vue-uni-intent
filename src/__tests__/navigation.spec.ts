import { describe, expect, it } from "vitest";
import { findNext, type NavCandidate } from "../navigation";

const rect = (x: number, y: number, width = 100, height = 40) => ({ x, y, width, height });

/**
 * 3×3 grid, 100×40 cells with 20px gaps:
 *   a b c
 *   d e f
 *   g h i
 */
const grid: Record<string, NavCandidate> = {};
for (const [row, ids] of [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]].entries()) {
  for (const [col, id] of ids.entries()) {
    grid[id] = { id, rect: rect(col * 120, row * 60) };
  }
}

const others = (id: string) => Object.values(grid).filter((c) => c.id !== id);

describe("findNext", () => {
  describe("3×3 grid", () => {
    it("moves along rows and columns from the center", () => {
      expect(findNext(grid.e!, others("e"), "up")).toBe("b");
      expect(findNext(grid.e!, others("e"), "down")).toBe("h");
      expect(findNext(grid.e!, others("e"), "left")).toBe("d");
      expect(findNext(grid.e!, others("e"), "right")).toBe("f");
    });

    it("prefers the direct neighbor over further cells in line", () => {
      expect(findNext(grid.a!, others("a"), "right")).toBe("b");
      expect(findNext(grid.a!, others("a"), "down")).toBe("d");
    });

    it("returns null at an edge without wrap", () => {
      expect(findNext(grid.a!, others("a"), "up")).toBeNull();
      expect(findNext(grid.a!, others("a"), "left")).toBeNull();
      expect(findNext(grid.i!, others("i"), "down")).toBeNull();
      expect(findNext(grid.c!, others("c"), "right")).toBeNull();
    });

    it("stays row-stable: right from d never diagonal-jumps to b or h", () => {
      expect(findNext(grid.d!, others("d"), "right")).toBe("e");
    });
  });

  describe("wrap-around", () => {
    it("wraps to the opposite edge of the same row/column", () => {
      expect(findNext(grid.c!, others("c"), "right", { wrap: true })).toBe("a");
      expect(findNext(grid.a!, others("a"), "left", { wrap: true })).toBe("c");
      expect(findNext(grid.g!, others("g"), "down", { wrap: true })).toBe("a");
      expect(findNext(grid.b!, others("b"), "up", { wrap: true })).toBe("h");
    });

    it("does not wrap when a candidate exists ahead", () => {
      expect(findNext(grid.b!, others("b"), "right", { wrap: true })).toBe("c");
    });

    it("does nothing on a single row when moving vertically", () => {
      const row = [grid.a!, grid.b!, grid.c!];
      const rowOthers = (id: string) => row.filter((c) => c.id !== id);
      expect(findNext(grid.a!, rowOthers("a"), "up", { wrap: true })).toBeNull();
      expect(findNext(grid.a!, rowOthers("a"), "down", { wrap: true })).toBeNull();
      expect(findNext(grid.b!, rowOthers("b"), "up", { wrap: true })).toBeNull();
    });

    it("does nothing on a single column when moving horizontally", () => {
      const column = [grid.a!, grid.d!, grid.g!];
      const columnOthers = (id: string) => column.filter((c) => c.id !== id);
      expect(findNext(grid.a!, columnOthers("a"), "left", { wrap: true })).toBeNull();
      expect(findNext(grid.d!, columnOthers("d"), "right", { wrap: true })).toBeNull();
    });
  });

  describe("cone preference", () => {
    it("picks an off-cone candidate when the cone is empty", () => {
      // Staggered: b is far right and one row down (outside the 45° cone, not aligned).
      const a: NavCandidate = { id: "a", rect: rect(0, 0) };
      const b: NavCandidate = { id: "b", rect: rect(200, 300) };
      expect(findNext(a, [b], "right")).toBe("b");
    });

    it("prefers an aligned candidate over a closer unaligned one", () => {
      const a: NavCandidate = { id: "a", rect: rect(0, 0) };
      // Same row, further away…
      const aligned: NavCandidate = { id: "aligned", rect: rect(400, 0) };
      // …vs. closer center distance but on another row.
      const unaligned: NavCandidate = { id: "unaligned", rect: rect(150, 200) };
      expect(findNext(a, [aligned, unaligned], "right")).toBe("aligned");
    });
  });

  describe("edge cases", () => {
    it("returns null with no candidates", () => {
      expect(findNext(grid.a!, [], "right")).toBeNull();
      expect(findNext(grid.a!, [], "right", { wrap: true })).toBeNull();
    });

    it("ignores candidates at the identical primary coordinate (epsilon)", () => {
      // Same column: no horizontal move possible.
      const top: NavCandidate = { id: "top", rect: rect(0, 0) };
      const bottom: NavCandidate = { id: "bottom", rect: rect(0, 100) };
      expect(findNext(top, [bottom], "right")).toBeNull();
      expect(findNext(top, [bottom], "left")).toBeNull();
    });

    it("breaks ties by candidate order", () => {
      const from: NavCandidate = { id: "from", rect: rect(0, 100) };
      // Two equidistant, symmetric candidates above/below the axis.
      const first: NavCandidate = { id: "first", rect: rect(200, 0) };
      const second: NavCandidate = { id: "second", rect: rect(200, 200) };
      expect(findNext(from, [first, second], "right")).toBe("first");
    });
  });
});
