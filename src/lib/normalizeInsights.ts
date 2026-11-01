import { humanizeIds } from "@/lib/humanizeIds";

export const INSIGHT_TYPES = ["idea", "question", "connection", "perspective"] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];
export type Insight = { type: InsightType; text: string };

/** Normalize the Make note_insights response into at most 8 clean suggestions. */
export function normalizeInsights(body: unknown): Insight[] {
  const raw = (body as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: unknown) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const t = String(o["type"] ?? "").toLowerCase().trim();
      const type: InsightType = (INSIGHT_TYPES as readonly string[]).includes(t) ? (t as InsightType) : "idea";
      const text = humanizeIds(String(o["text"] ?? ""), new Map()).slice(0, 500).trim();
      return { type, text };
    })
    .filter((s) => s.text)
    .slice(0, 8);
}
