import UserModel from "@/model/User.model";

/**
 * Turn an arbitrary string (email local-part or display name) into a valid
 * base username: alphanumeric only, 2–20 chars, lowercased.
 */
export function baseUsername(input: string): string {
  const cleaned = (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  if (cleaned.length >= 2) return cleaned;
  // Pad short/empty inputs to satisfy the 2-char minimum.
  return (cleaned + "user").slice(0, 20);
}

/**
 * Produce a username that isn't already taken, appending a numeric suffix if
 * needed. Requires an active DB connection.
 */
export async function generateUniqueUsername(input: string): Promise<string> {
  const base = baseUsername(input);
  if (!(await UserModel.exists({ username: base }))) return base;

  for (let i = 0; i < 100; i++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = (base.slice(0, 20 - suffix.length) + suffix).slice(0, 20);
    if (!(await UserModel.exists({ username: candidate }))) return candidate;
  }
  // Extremely unlikely fallback.
  return (base.slice(0, 7) + Date.now().toString(36)).slice(0, 20);
}
