import { createHash } from "crypto";

// Never store raw sender IPs. A salted SHA-256 gives a stable, non-reversible
// identifier so a recipient can block a sender without us retaining their IP.
const SALT =
  process.env.IP_HASH_SALT ||
  process.env.NEXTAUTH_SECRET ||
  "candor-dev-salt";

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex");
}
