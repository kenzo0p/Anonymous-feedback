import { describe, it, expect } from "vitest";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";

describe("ratelimit (in-memory fallback)", () => {
  it("allows up to the limit then blocks", async () => {
    // `auth` is 5 per minute. Use a unique identifier so the sliding window
    // for this test doesn't collide with any other test.
    const id = `test-${Date.now()}-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push((await ratelimit.auth.limit(id)).success);
    }
    expect(results.slice(0, 5).every(Boolean)).toBe(true);
    expect(results[5]).toBe(false);
  });

  it("tracks separate identifiers independently", async () => {
    const a = `a-${Date.now()}-${Math.random()}`;
    const b = `b-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) await ratelimit.auth.limit(a);
    // `a` is now exhausted, but `b` should still have its full budget.
    expect((await ratelimit.auth.limit(a)).success).toBe(false);
    expect((await ratelimit.auth.limit(b)).success).toBe(true);
  });

  it("reports remaining budget", async () => {
    const id = `rem-${Date.now()}-${Math.random()}`;
    const first = await ratelimit.usernameCheck.limit(id); // 20 / min
    expect(first.remaining).toBe(19);
  });
});

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip then a default", () => {
    const withReal = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(withReal)).toBe("198.51.100.7");
    expect(getClientIp(new Request("http://localhost"))).toBe("127.0.0.1");
  });
});

describe("tooManyRequests", () => {
  it("returns a 429 with a Retry-After header", async () => {
    const res = tooManyRequests(Date.now() + 5000);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
