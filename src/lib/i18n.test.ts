import { describe, expect, it } from "vitest";
import { DICTS } from "./i18n";

const KEYS = ["aiIdea", "aiQuestion", "aiConnection", "aiPerspective", "toMap", "addInsightToMap"] as const;

describe("insight labels", () => {
  it("are translated in Hebrew and Arabic", () => {
    for (const k of KEYS) {
      for (const l of ["he", "ar"] as const) {
        expect(DICTS[l][k]).toBeTruthy();
        expect(DICTS[l][k]).not.toBe(DICTS.en[k]);
      }
    }
  });
  it("note and insight buttons have different labels in every language", () => {
    for (const l of ["en", "he", "ar"] as const) expect(DICTS[l].toMap).not.toBe(DICTS[l].addInsightToMap);
  });
});
