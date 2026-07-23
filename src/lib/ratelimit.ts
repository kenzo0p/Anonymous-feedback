import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

interface Limiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

// ---------------------------------------------------------------------------
// In-memory fallback for local dev / single-instance deploys. Not shared across
// serverless instances — configure Upstash in production for distributed limits.
// ---------------------------------------------------------------------------
const memoryStore = new Map<string, { count: number; reset: number }>();

function parseWindowMs(window: Duration): number {
  const [value, unit] = window.split(" ");
  const n = Number(value);
  switch (unit[0]) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60_000;
    case "h":
      return n * 3_600_000;
    case "d":
      return n * 86_400_000;
    default:
      return n * 1000;
  }
}

function memoryLimiter(limit: number, windowMs: number, prefix: string): Limiter {
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const key = `${prefix}:${identifier}`;

      // Opportunistic prune so the map can't grow unbounded.
      if (memoryStore.size > 5000) {
        for (const [k, v] of memoryStore) {
          if (v.reset <= now) memoryStore.delete(k);
        }
      }

      const entry = memoryStore.get(key);
      if (!entry || entry.reset <= now) {
        memoryStore.set(key, { count: 1, reset: now + windowMs });
        return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
      }
      entry.count += 1;
      return {
        success: entry.count <= limit,
        limit,
        remaining: Math.max(0, limit - entry.count),
        reset: entry.reset,
      };
    },
  };
}

function makeLimiter(tokens: number, window: Duration, prefix: string): Limiter {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix,
      analytics: false,
    }) as unknown as Limiter;
  }
  return memoryLimiter(tokens, parseWindowMs(window), prefix);
}

/**
 * Per-purpose limiters. Tune the token/window pairs to taste.
 */
export const ratelimit = {
  /** Sign-in attempts, keyed by account identifier. */
  auth: makeLimiter(5, "1 m", "rl:auth"),
  /** Account registration, keyed by IP. */
  signup: makeLimiter(5, "1 h", "rl:signup"),
  /** Anonymous message sends, keyed by IP. */
  sendMessage: makeLimiter(5, "1 m", "rl:send"),
  /**
   * Verification-code submissions, keyed by IP + username. Looser than the
   * per-account attempt cap (5) so that cap stays the primary control while
   * this backstops distributed abuse.
   */
  verify: makeLimiter(10, "10 m", "rl:verify"),
  /** Live username-availability checks, keyed by IP. */
  usernameCheck: makeLimiter(20, "1 m", "rl:uname"),
  /** Password-reset requests (email sending), keyed by IP + email. */
  forgotPassword: makeLimiter(3, "15 m", "rl:forgot"),
  /**
   * Reset-code submissions, keyed by IP + email. Looser than the per-account
   * attempt cap (5) so that cap stays the primary control.
   */
  resetPassword: makeLimiter(10, "10 m", "rl:reset"),
  /** Authenticated account changes, keyed by user id. */
  account: makeLimiter(10, "1 m", "rl:acct"),
};

/** Best-effort client IP from proxy headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(reset: number): Response {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    {
      success: false,
      message: `Too many requests. Please try again in ${retryAfter}s.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
