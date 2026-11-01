import { describe, expect, it } from "vitest";
import { normalizeInsights } from "./normalizeInsights";

describe("normalizeInsights", () => {
  it("maps an unknown type to idea", () => {
    expect(normalizeInsights({ suggestions: [{ type: "weird", text: "Hi" }] })).toEqual([{ type: "idea", text: "Hi" }]);
  });
  it("drops empty suggestions", () => {
    expect(normalizeInsights({ suggestions: [{ type: "question", text: "  " }, { type: "Question", text: "Why?" }] })).toEqual([{ type: "question", text: "Why?" }]);
  });
  it("removes raw UUIDs from text", () => {
    expect(normalizeInsights({ suggestions: [{ type: "connection", text: "Link to 3e511519-b6a9-4ee7-b06f-a141ed0aec39 now" }] })[0]?.text).toBe("Link to now");
  });
  it("keeps at most 8 suggestions", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ type: "idea", text: `i${i}` }));
    expect(normalizeInsights({ suggestions: many })).toHaveLength(8);
  });
  it("returns nothing for a malformed body", () => {
    expect(normalizeInsights("oops")).toEqual([]);
  });
});
