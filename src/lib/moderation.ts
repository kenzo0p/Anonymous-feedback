/**
 * Lightweight content filter for incoming anonymous messages.
 *
 * The default blocklist targets obvious spam. Operators can extend it without
 * a code change via the `BLOCKED_WORDS` env var (comma-separated). Matching is
 * case-insensitive substring matching — intentionally simple and predictable.
 */
const DEFAULT_BLOCKLIST = [
  "viagra",
  "casino",
  "crypto giveaway",
  "free money",
  "click here to win",
];

export function getBlocklist(): string[] {
  const extra = (process.env.BLOCKED_WORDS ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_BLOCKLIST, ...extra];
}

export function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return getBlocklist().some((word) => lower.includes(word));
}
