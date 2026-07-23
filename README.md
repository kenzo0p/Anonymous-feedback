<div align="center">
  <img src="src/app/icon.svg" alt="Candor logo" width="72" height="72" />

  # Candor

  **Honest feedback, anonymously.**

  Share a link, collect anonymous messages from anyone — no names attached, just real thoughts delivered to you.

  <sub>Built with Next.js · TypeScript · Tailwind · MongoDB · NextAuth</sub>
</div>

---

## Overview

Candor gives every user a personal public link. Anyone can visit it and send an
anonymous message — no account required. Recipients read, manage, and delete
their messages from a private dashboard, and can pause their inbox at any time.
Senders who need a nudge can generate AI-suggested prompts to break the ice.

## Features

- 🔗 **Personal share link** — `/u/your-username` for collecting anonymous messages
- 🕵️ **True anonymity** — senders need no account and are never identified
- 🔐 **Credentials auth** — email/username + password via NextAuth (JWT sessions)
- ✉️ **Email verification & password reset** — 6-digit codes delivered with Resend + React Email
- ⚙️ **Account settings** — change username (live session refresh), change password, delete account
- 💬 **Custom prompt** — a personalized, SSR headline on your public page (e.g. "Ask me anything about my talk")
- 📱 **QR code & sharing** — a downloadable QR for your link plus native Web Share on the dashboard
- 🛡️ **Abuse protection** — rate limiting, a verify-code attempt cap, a content filter, and block-a-sender (even though senders are anonymous)
- 🎛️ **Inbox controls** — toggle message acceptance on/off from the dashboard
- 📥 **Paginated inbox** — messages live in their own indexed collection with "load more"
- 🔎 **Search & sort** — filter your inbox by content and order newest/oldest first
- 📊 **Overview** — message stats (total, last 7 days, today) with a 14-day trend chart
- ⬇️ **Export** — download your inbox as CSV (or JSON)
- 📧 **Email digest** — optional periodic email summarizing new messages (opt-out in settings)
- ✨ **AI prompt suggestions** — streamed message ideas to help senders get started
- 🌗 **Light & dark themes** — an editorial, minimal-mono design system with a flicker-free theme toggle
- ✅ **Type-safe & validated** — end-to-end TypeScript with Zod schemas on every form and route

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives) |
| Auth | [NextAuth](https://next-auth.js.org/) (Credentials provider, JWT) |
| Database | MongoDB + [Mongoose](https://mongoosejs.com/) |
| Email | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| AI | OpenAI via the [Vercel AI SDK](https://sdk.vercel.ai/) (`useCompletion`) |
| Rate limiting | [@upstash/ratelimit](https://github.com/upstash/ratelimit) (in-memory fallback) |
| Validation | [Zod](https://zod.dev/) + React Hook Form |

## Getting started

### Prerequisites

- **Node.js** 18.18+ (20+ recommended)
- A **MongoDB** connection string (local `mongod`, Docker, or MongoDB Atlas)
- A **Resend** API key (for verification emails)
- An **OpenAI** API key (for message suggestions)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/candor

# NextAuth
NEXTAUTH_SECRET=replace-with-a-long-random-string
NEXTAUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# AI suggestions (OpenAI)
OPENAI_API_KEY=your-openai-api-key

# Optional: distributed rate limiting (Upstash Redis).
# If unset, an in-memory limiter is used — fine for local dev / a single
# instance, but configure Upstash for serverless / multi-instance production.
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
```

> Generate a strong secret with `openssl rand -base64 32`.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Spin up a local MongoDB (optional)

```bash
docker run -d --name candor-mongo -p 27017:27017 mongo:7
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc` |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Vitest in watch mode |

Dev/ops helpers in `scripts/`:

- `node --env-file=.env scripts/seed-test-user.mjs` — seed a verified user with sample messages (dev only)
- `node --env-file=.env scripts/migrate-messages.mjs` — backfill embedded `users.messages[]` into the standalone `messages` collection (`PRUNE=1` to remove the old arrays afterward)

## Project structure

```
src/
├── app/
│   ├── (app)/dashboard/      # Authenticated dashboard (paginated inbox)
│   ├── (auth)/               # sign-in, sign-up, verify
│   ├── api/                  # Route handlers (see below)
│   ├── u/[username]/         # Public message page
│   ├── context/              # AuthProvider (SessionProvider)
│   ├── icon.svg              # App favicon (the Candor mark)
│   ├── layout.tsx            # Root layout + theme init
│   └── page.tsx              # Landing page
├── components/               # Logo, Navbar, MessageCard, ThemeToggle, ui/
├── helpers/                  # sendVerificationEmail
├── lib/                      # dbConnect, resend, ratelimit, utils
├── model/                    # Mongoose User + Message models
├── schemas/                  # Zod schemas
├── types/                    # ApiResponse, next-auth augmentation
└── middleware.ts             # Route protection
emails/                       # React Email templates
scripts/                      # Seed + migration helpers
```

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/sign-up` | Register a user and send a verification code |
| `POST` | `/api/verify-code` | Verify an account with its code |
| `POST` | `/api/forgot-password` | Email a password-reset code (no account enumeration) |
| `POST` | `/api/reset-password` | Reset the password with an emailed code |
| `GET`  | `/api/check-username-unique` | Live username-availability check |
| `POST` | `/api/send-message` | Send an anonymous message (public; content-filtered) |
| `POST` | `/api/block-sender` | Block a sender and purge their messages |
| `GET`  | `/api/get-messages` | Fetch the signed-in user's messages (`?page`, `?limit`, `?q`, `?sort`) |
| `GET`  | `/api/stats` | Inbox stats + 14-day daily series |
| `GET`  | `/api/export` | Download messages (`?format=csv\|json`) |
| `GET` / `POST` | `/api/update-digest` | Read / toggle the email-digest preference |
| `GET`  | `/api/cron/send-digests` | Cron: email digests (Bearer `CRON_SECRET`) |
| `DELETE` | `/api/delete-message/[messageid]` | Delete a message (owner-scoped) |
| `GET` / `POST` | `/api/accept-messages` | Read / toggle inbox acceptance |
| `POST` | `/api/change-password` | Change password (requires current password) |
| `POST` | `/api/update-username` | Change username (uniqueness-checked) |
| `GET` / `POST` | `/api/update-prompt` | Read / set the public-page prompt |
| `DELETE` | `/api/delete-account` | Delete account + all messages (password-confirmed) |
| `POST` | `/api/suggest-messages` | Stream AI-generated message prompts |
| `*` | `/api/auth/[...nextauth]` | NextAuth handlers |

## Testing & CI

Unit tests (Zod schemas, the rate limiter, moderation, utilities) run anywhere
with `npm test`. Integration tests — model behavior and the actual API route
handlers (moderation, verify-code cap, ownership scoping, pagination, password
reset) — activate automatically when `MONGODB_URI` is set, and skip otherwise.
Every push and pull request runs [CI](.github/workflows/ci.yml) — lint, type
check, tests (against a MongoDB service), and a production build.

## Security

- **Rate limiting** (`src/lib/ratelimit.ts`) guards the sensitive routes: sign-in
  (per account), sign-up, anonymous message sends, verification-code
  submissions, and username checks. It uses Upstash Redis when configured and a
  built-in in-memory limiter otherwise.
- **Verify-code hardening** — verification codes are capped at 5 attempts. After
  the cap is hit the code is invalidated (so the remaining 6-digit space can't
  be brute-forced) and the user must request a new one.
- **Owner-scoped deletes** — message deletion is scoped to the authenticated
  recipient, so users can only delete their own messages.
- **Moderation** — incoming messages pass a content blocklist
  (`src/lib/moderation.ts`, extendable via `BLOCKED_WORDS`). Recipients can
  block a sender by a salted IP hash (`src/lib/hashIp.ts`) — future messages are
  silently dropped and the sender's existing messages are purged. Raw sender IPs
  are never stored.

## Design

Candor uses a **minimal-mono** system: ink-on-paper surfaces, hairline borders,
Geist typography, and a single restrained cobalt accent used sparingly. The
logo mark is an open aperture "C" with a focal dot — an opening for honest
words, and a lens that sees clearly. Full light and dark themes ship out of the
box, with the theme set before first paint to avoid a flash.

## Deployment

Deploy on any Node host or [Vercel](https://vercel.com/). Set the same
environment variables in your host's dashboard, point `NEXTAUTH_URL` at your
production URL, use a managed MongoDB (e.g. Atlas), and configure Upstash Redis
so rate limiting works across serverless instances.

## License

Released under the MIT License.
