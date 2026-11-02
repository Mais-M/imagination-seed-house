import { describe, expect, it } from "vitest";
import { estimateBubbleSize, findFreeSpot, type Box } from "./placement";

const hit = (a: Box, b: Box) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;

describe("findFreeSpot", () => {
  it("returns the centre when the map is empty", () => {
    expect(findFreeSpot([], { w: 200, h: 60 })).toEqual({ x: 0, y: 0 });
  });
  it("avoids overlapping an existing bubble", () => {
    const e: Box = { x: 0, y: 0, w: 200, h: 60 };
    const p = findFreeSpot([e], { w: 200, h: 60 });
    expect(hit({ ...p, w: 200, h: 60 }, e)).toBe(false);
  });
  it("a long new bubble does not overlap a tall existing bubble", () => {
    const tall: Box = { x: 0, y: 0, w: 280, h: 300 };
    const size = estimateBubbleSize("x".repeat(400), true);
    const p = findFreeSpot([tall], size);
    expect(hit({ ...p, ...size }, tall)).toBe(false);
  });
  it("uses the given (measured) size rather than a guess", () => {
    const big: Box = { x: 0, y: 0, w: 280, h: 500 };
    const p = findFreeSpot([big], { w: 120, h: 50 });
    expect(Math.abs(p.y) * 2 >= 550 || Math.abs(p.x) * 2 >= 400).toBe(true);
  });
  it("never changes existing bubble positions", () => {
    const e: Box[] = [{ x: 5, y: 7, w: 150, h: 60 }];
    findFreeSpot(e, { w: 150, h: 60 });
    expect(e[0]).toEqual({ x: 5, y: 7, w: 150, h: 60 });
  });
});

describe("estimateBubbleSize", () => {
  it("longer text is never shorter", () => {
    expect(estimateBubbleSize("a".repeat(300), false).h).toBeGreaterThan(estimateBubbleSize("a".repeat(30), false).h);
  });
  it("width stays within 110–280px", () => {
    expect(estimateBubbleSize("", false).w).toBe(110);
    expect(estimateBubbleSize("a".repeat(500), false).w).toBe(280);
  });
  it("Hebrew/Arabic estimates are at least as large as English", () => {
    const en = estimateBubbleSize("a".repeat(200), false);
    for (const ch of ["ש", "ع"]) {
      const o = estimateBubbleSize(ch.repeat(200), false);
      expect(o.h).toBeGreaterThanOrEqual(en.h);
      expect(o.w).toBeGreaterThanOrEqual(en.w);
    }
  });
});
