import { describe, expect, it } from "vitest";
import { humanizeIds } from "./humanizeIds";

const id = "3e511519-b6a9-4ee7-b06f-a141ed0aec39";
const labels = new Map([[id, "Cat jumps"]]);

describe("humanizeIds", () => {
  it("replaces a known node UUID with its label", () => {
    expect(humanizeIds(`Connects naturally to node ${id} as part of the motion.`, labels)).toBe('Connects naturally to "Cat jumps" as part of the motion.');
  });
  it("removes an unknown UUID", () => {
    expect(humanizeIds("Links to 11111111-2222-3333-4444-555555555555.", labels)).toBe("Links to.");
  });
  it("leaves plain text unchanged", () => {
    expect(humanizeIds("What if the cat could fly?", labels)).toBe("What if the cat could fly?");
  });
});
