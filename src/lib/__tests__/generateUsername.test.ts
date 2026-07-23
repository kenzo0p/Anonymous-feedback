import { describe, it, expect } from "vitest";
import { baseUsername } from "@/lib/generateUsername";

describe("baseUsername", () => {
  it("strips non-alphanumerics and lowercases", () => {
    expect(baseUsername("Alex.Doe+dev@example.com".split("@")[0])).toBe(
      "alexdoedev"
    );
    expect(baseUsername("Jane Doe")).toBe("janedoe");
  });

  it("caps at 20 characters", () => {
    expect(baseUsername("a".repeat(50)).length).toBe(20);
  });

  it("pads short or empty inputs to at least 2 chars", () => {
    expect(baseUsername("a").length).toBeGreaterThanOrEqual(2);
    expect(baseUsername("").length).toBeGreaterThanOrEqual(2);
    expect(baseUsername("!!!")).toMatch(/^[a-z0-9]{2,20}$/);
  });
});
