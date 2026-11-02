export type Size = { w: number; h: number };
export type Box = { x: number; y: number } & Size;

/** Rendered bubble sizes reported by the mind map (display only, never saved). */
export const bubbleSizes = new Map<string, Size>();

const MIN_W = 110;
const MAX_W = 280;
const PAD_X = 40; // px-5 on both sides
const PAD_Y = 24; // py-3 top + bottom
const LINE_H = 22; // text-base leading-snug, rounded up
const AI_LABEL = 14; // badge overhanging the top

/** Conservative estimate of a bubble's size from its text; rounds up so it never underestimates. */
export function estimateBubbleSize(text: string, isAi: boolean): Size {
  const s = text ?? "";
  // Average glyph width; non-Latin scripts (Hebrew, Arabic, etc.) get a wider allowance.
  const wide = /[^\u0000-\u024F]/.test(s);
  const charW = wide ? 10.5 : 9.5;
  const textW = Math.ceil(s.length * charW);
  const w = Math.min(MAX_W, Math.max(MIN_W, textW + PAD_X));
  const inner = w - PAD_X;
  const lines = Math.max(1, Math.ceil((textW * 1.15) / inner));
  const h = lines * LINE_H + PAD_Y + (isAi ? AI_LABEL : 0);
  return { w, h };
}

const overlaps = (a: Box, b: Box, gap: number) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w + gap * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2;

export type Rect = { minX: number; minY: number; maxX: number; maxY: number };

/** Visible part of the mind map below the floating toolbar, in map coordinates (display only, never saved). */
export const visibleArea: { current: Rect | null } = { current: null };

const inside = (p: { x: number; y: number }, s: Size, r: Rect) =>
  p.x - s.w / 2 >= r.minX && p.x + s.w / 2 <= r.maxX && p.y - s.h / 2 >= r.minY && p.y + s.h / 2 <= r.maxY;

/**
 * First non-overlapping centre on a spiral around (cx, cy). Never moves existing bubbles.
 * With `prefer`, spots fully inside that rectangle are tried first; otherwise falls back to any free spot.
 */
export function findFreeSpot(
  existing: readonly Box[],
  size: Size,
  opts: { cx?: number; cy?: number; gap?: number; maxR?: number; prefer?: Rect | null } = {},
) {
  const { cx = 0, cy = 0, gap = 24, maxR = 2000, prefer } = opts;
  const passes = prefer ? [prefer, null] : [null];
  let last = { x: cx, y: cy };
  for (const area of passes) {
    for (let r = 0; r <= maxR; r += 40) {
      const steps = r === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * r) / 60));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = { x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r * 0.7) };
        if (area && !inside(p, size, area)) continue;
        if (!area) last = p;
        if (!existing.some((e) => overlaps({ ...p, ...size }, e, gap))) return p;
      }
    }
  }
  return last;
}

/** Place several new bubbles one after another; each placed bubble counts as taken for the next. */
export function placeMany(
  existing: readonly Box[],
  items: readonly ({ cx: number; cy: number } & Size)[],
  opts: { gap?: number; prefer?: Rect | null } = {},
) {
  const taken: Box[] = [...existing];
  return items.map((it) => {
    const p = findFreeSpot(taken, it, { ...opts, cx: it.cx, cy: it.cy });
    taken.push({ ...p, w: it.w, h: it.h });
    return p;
  });
}

/** New bubble ids the mind map should bring into view once (display only, never saved). */
export const pendingReveal: { ids: string[] } = { ids: [] };

/**
 * Smallest map-space shift that brings all boxes inside `area` (0,0 when already visible).
 * If the group is larger than the area on an axis, it is centred on that axis instead.
 */
export function revealShift(boxes: readonly Box[], area: Rect) {
  if (!boxes.length) return { dx: 0, dy: 0 };
  const minX = Math.min(...boxes.map((b) => b.x - b.w / 2)), maxX = Math.max(...boxes.map((b) => b.x + b.w / 2));
  const minY = Math.min(...boxes.map((b) => b.y - b.h / 2)), maxY = Math.max(...boxes.map((b) => b.y + b.h / 2));
  const axis = (lo: number, hi: number, aLo: number, aHi: number) => {
    if (hi - lo > aHi - aLo) return (aLo + aHi) / 2 - (lo + hi) / 2;
    if (lo < aLo) return aLo - lo;
    if (hi > aHi) return aHi - hi;
    return 0;
  };
  return { dx: axis(minX, maxX, area.minX, area.maxX), dy: axis(minY, maxY, area.minY, area.maxY) };
}
