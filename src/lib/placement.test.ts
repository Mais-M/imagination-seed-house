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

import { placeMany } from "./placement";
describe("visible-area and multi placement", () => {
  const ov = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
    Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
  const S = { w: 200, h: 80 };
  it("Spark ring spots already taken get non-overlapping replacements", () => {
    const ring = [{ cx: 0, cy: -320 }, { cx: 320, cy: 0 }, { cx: 0, cy: 320 }, { cx: -320, cy: 0 }];
    const existing = ring.map((r) => ({ x: r.cx, y: r.cy, ...S }));
    const spots = placeMany(existing, ring.map((r) => ({ ...r, ...S })));
    spots.forEach((p) => existing.forEach((e) => expect(ov({ ...p, ...S }, e)).toBe(false)));
  });
  it("running twice never stacks bubbles", () => {
    const ring = [{ cx: 0, cy: -320 }, { cx: 320, cy: 0 }];
    const first = placeMany([], ring.map((r) => ({ ...r, ...S })));
    const existing = first.map((p) => ({ ...p, ...S }));
    const second = placeMany(existing, ring.map((r) => ({ ...r, ...S })));
    const all = [...existing, ...second.map((p) => ({ ...p, ...S }))];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(ov(all[i]!, all[j]!)).toBe(false);
  });
  it("prefers the visible area and skips the toolbar band", () => {
    const prefer = { minX: -400, maxX: 400, minY: -200, maxY: 300 }; // toolbar is above minY
    const p = findFreeSpot([], S, { cx: 0, cy: -400, prefer });
    expect(p.y - S.h / 2).toBeGreaterThanOrEqual(-200);
    expect(p.y + S.h / 2).toBeLessThanOrEqual(300);
  });
  it("falls back outside when the visible area is full", () => {
    const prefer = { minX: -100, maxX: 100, minY: -40, maxY: 40 };
    const p = findFreeSpot([{ x: 0, y: 0, w: 200, h: 80 }], S, { prefer });
    expect(ov({ ...p, ...S }, { x: 0, y: 0, w: 200, h: 80 })).toBe(false);
  });
  it("never changes existing positions", () => {
    const existing = [{ x: 5, y: 6, ...S }];
    const copy = JSON.stringify(existing);
    placeMany(existing, [{ cx: 5, cy: 6, ...S }], { prefer: { minX: -500, maxX: 500, minY: -500, maxY: 500 } });
    expect(JSON.stringify(existing)).toBe(copy);
  });
});

import { revealShift } from "./placement";
describe("revealShift (view only)", () => {
  const area = { minX: -400, maxX: 400, minY: -200, maxY: 300 };
  it("does not move the view when new bubbles are already visible", () => {
    expect(revealShift([{ x: 0, y: 0, w: 200, h: 80 }], area)).toEqual({ dx: 0, dy: 0 });
  });
  it("one shift reveals a whole group of Spark suggestions", () => {
    const group = [{ x: 600, y: 0, w: 200, h: 80 }, { x: 700, y: 100, w: 200, h: 80 }];
    const s = revealShift(group, area);
    group.forEach((b) => {
      expect(b.x + s.dx - b.w / 2).toBeGreaterThanOrEqual(area.minX);
      expect(b.x + s.dx + b.w / 2).toBeLessThanOrEqual(area.maxX);
    });
    expect(s.dy).toBe(0);
  });
  it("reveals a bubble hidden under the toolbar", () => {
    const s = revealShift([{ x: 0, y: -260, w: 200, h: 80 }], area);
    expect(-260 + s.dy - 40).toBeGreaterThanOrEqual(area.minY);
  });
  it("never changes the bubbles themselves", () => {
    const b = [{ x: 900, y: 900, w: 100, h: 50 }];
    revealShift(b, area);
    expect(b[0]).toEqual({ x: 900, y: 900, w: 100, h: 50 });
  });
});
