import { describe, it, expect, afterEach } from "vitest";
import { containsBlockedContent, getBlocklist } from "@/lib/moderation";
import { hashIp } from "@/lib/hashIp";

describe("containsBlockedContent", () => {
  it("flags default-blocklist terms case-insensitively", () => {
    expect(containsBlockedContent("Cheap VIAGRA here")).toBe(true);
    expect(containsBlockedContent("join the casino tonight")).toBe(true);
  });

  it("allows normal messages", () => {
    expect(containsBlockedContent("Great talk today, thank you!")).toBe(false);
  });
});

describe("getBlocklist (env extension)", () => {
  afterEach(() => {
    delete process.env.BLOCKED_WORDS;
  });

  it("merges BLOCKED_WORDS from the environment", () => {
    process.env.BLOCKED_WORDS = "frobnicate, WIDGETSPAM";
    const list = getBlocklist();
    expect(list).toContain("frobnicate");
    expect(list).toContain("widgetspam"); // normalized to lowercase
    expect(containsBlockedContent("please do not frobnicate")).toBe(true);
  });
});

describe("hashIp", () => {
  it("is deterministic and non-reversible-looking", () => {
    const a = hashIp("203.0.113.5");
    const b = hashIp("203.0.113.5");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/); // sha-256 hex
    expect(a).not.toContain("203.0.113.5");
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("1.1.1.1")).not.toBe(hashIp("2.2.2.2"));
  });
});
