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

/** First non-overlapping centre on a spiral around (cx, cy). Never moves existing bubbles. */
export function findFreeSpot(existing: readonly Box[], size: Size, opts: { cx?: number; cy?: number; gap?: number; maxR?: number } = {}) {
  const { cx = 0, cy = 0, gap = 24, maxR = 2000 } = opts;
  let last = { x: cx, y: cy };
  for (let r = 0; r <= maxR; r += 40) {
    const steps = r === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * r) / 60));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p = { x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r * 0.7) };
      last = p;
      if (!existing.some((e) => overlaps({ ...p, ...size }, e, gap))) return p;
    }
  }
  return last;
}
