import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  type Mock,
} from "vitest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// --- Mocks (hoisted) ---------------------------------------------------------
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/helpers/sendVerificationEmail", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true, message: "sent" }),
}));
vi.mock("@/helpers/sendResetPasswordEmail", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue({ success: true, message: "sent" }),
}));
vi.mock("@/helpers/sendDigestEmail", () => ({
  sendDigestEmail: vi.fn().mockResolvedValue({ success: true, message: "sent" }),
}));

import { getServerSession } from "next-auth";
import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import { hashIp } from "@/lib/hashIp";

import { POST as signUp } from "@/app/api/sign-up/route";
import { POST as verifyCode } from "@/app/api/verify-code/route";
import { POST as sendMessage } from "@/app/api/send-message/route";
import { GET as getMessages } from "@/app/api/get-messages/route";
import { DELETE as deleteMessage } from "@/app/api/delete-message/[messageid]/route";
import { POST as blockSender } from "@/app/api/block-sender/route";
import { POST as forgotPassword } from "@/app/api/forgot-password/route";
import { POST as resetPassword } from "@/app/api/reset-password/route";
import { GET as getStats } from "@/app/api/stats/route";
import { GET as exportMessages } from "@/app/api/export/route";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { GET as sendDigests } from "@/app/api/cron/send-digests/route";
import { sendDigestEmail } from "@/helpers/sendDigestEmail";

type SignInArg = Parameters<
  NonNullable<NonNullable<typeof authOptions.callbacks>["signIn"]>
>[0];

const uri = process.env.MONGODB_URI;
const mockedSession = getServerSession as unknown as Mock;

// --- Helpers -----------------------------------------------------------------
const createdUserIds: mongoose.Types.ObjectId[] = [];
let n = 0;
const uniq = () => `${Date.now().toString(36)}_${n++}`;
const randIp = () =>
  `10.${(n * 7) % 254}.${(n * 13) % 254}.${(n * 17) % 254}`;

function postReq(body: unknown, ip = randIp()) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function makeUser(overrides: Record<string, unknown> = {}) {
  const id = uniq();
  const user = await UserModel.create({
    username: `u_${id}`,
    email: `${id}@rt.test`,
    password: await bcrypt.hash("password123", 10),
    verifyCode: "123456",
    verifyCodeExpiry: new Date(Date.now() + 3600000),
    isVerified: true,
    isAcceptingMessages: true,
    ...overrides,
  });
  createdUserIds.push(user._id as mongoose.Types.ObjectId);
  return user;
}

function asSession(user: { _id: unknown; username: string }) {
  mockedSession.mockResolvedValue({
    user: { _id: String(user._id), username: user.username },
  });
}

describe.skipIf(!uri)("API routes (integration)", () => {
  beforeAll(async () => {
    await mongoose.connect(uri as string);
  });

  afterAll(async () => {
    await MessageModel.deleteMany({ recipient: { $in: createdUserIds } });
    await UserModel.deleteMany({ _id: { $in: createdUserIds } });
    await mongoose.disconnect();
  });

  // --- sign-up + verify-code -------------------------------------------------
  it("sign-up creates an unverified user", async () => {
    const email = `${uniq()}@rt.test`;
    const res = await signUp(
      postReq({ username: `nu_${uniq()}`, email, password: "password123" })
    );
    expect(res.status).toBe(201);
    const user = await UserModel.findOne({ email });
    expect(user).toBeTruthy();
    expect(user!.isVerified).toBe(false);
    createdUserIds.push(user!._id as mongoose.Types.ObjectId);
  });

  it("verify-code counts down then invalidates the code", async () => {
    const user = await makeUser({ isVerified: false, verifyAttempts: 0 });
    // wrong code
    const wrong = await verifyCode(
      postReq({ username: user.username, code: "000000" })
    );
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).message).toMatch(/attempts? remaining/);

    // exhaust to the cap
    await UserModel.updateOne({ _id: user._id }, { verifyAttempts: 5 });
    const capped = await verifyCode(
      postReq({ username: user.username, code: "000000" })
    );
    expect(capped.status).toBe(429);
    const after = await UserModel.findById(user._id);
    expect(new Date(after!.verifyCodeExpiry!).getTime()).toBe(0); // invalidated
  });

  it("verify-code verifies with the correct code", async () => {
    const user = await makeUser({ isVerified: false, verifyAttempts: 0 });
    const res = await verifyCode(
      postReq({ username: user.username, code: "123456" })
    );
    expect(res.status).toBe(200);
    expect((await UserModel.findById(user._id))!.isVerified).toBe(true);
  });

  // --- OAuth upsert ----------------------------------------------------------
  it("OAuth signIn upserts a verified, passwordless user once", async () => {
    const email = `oauth_${uniq()}@rt.test`;
    const arg = {
      user: { id: "g1", email, name: "OAuth Person" },
      account: { provider: "google", type: "oauth", providerAccountId: "g1" },
    } as unknown as SignInArg;

    const ok = await authOptions.callbacks!.signIn!(arg);
    expect(ok).toBe(true);

    const created = await UserModel.findOne({ email });
    expect(created).toBeTruthy();
    createdUserIds.push(created!._id as mongoose.Types.ObjectId);
    expect(created!.isVerified).toBe(true);
    expect(created!.username).toMatch(/^[a-z0-9]{2,20}$/);
    expect(created!.password).toBeFalsy(); // no local password

    // A second sign-in with the same email must not duplicate the account.
    await authOptions.callbacks!.signIn!(arg);
    expect(await UserModel.countDocuments({ email })).toBe(1);
  });

  it("credentials sign-in is rejected for a passwordless (OAuth) account", async () => {
    const user = await makeUser({ password: undefined });
    // NextAuth's top-level `authorize` is a no-op; the real one is on `options`.
    const credProvider = authOptions.providers.find(
      (p) => p.id === "credentials"
    ) as unknown as {
      options: { authorize: (c: Record<string, string>) => Promise<unknown> };
    };
    let error: unknown;
    try {
      await credProvider.options.authorize({
        identifier: user.email,
        password: "whatever",
      });
    } catch (e) {
      error = e;
    }
    expect((error as Error | undefined)?.message).toMatch(/social sign-in/i);
  });

  // --- send-message (moderation) --------------------------------------------
  it("send-message blocks flagged content", async () => {
    const user = await makeUser();
    const res = await sendMessage(
      postReq({ username: user.username, content: "cheap viagra for sale here" })
    );
    expect(res.status).toBe(400);
    expect(await MessageModel.countDocuments({ recipient: user._id })).toBe(0);
  });

  it("send-message 404s unknown users and 403s paused inboxes", async () => {
    const notFound = await sendMessage(
      postReq({ username: `ghost_${uniq()}`, content: "a normal message here" })
    );
    expect(notFound.status).toBe(404);

    const paused = await makeUser({ isAcceptingMessages: false });
    const res = await sendMessage(
      postReq({ username: paused.username, content: "a normal message here" })
    );
    expect(res.status).toBe(403);
  });

  it("send-message stores a clean message with a sender hash", async () => {
    const user = await makeUser();
    const ip = "203.0.113.44";
    const res = await sendMessage(
      postReq({ username: user.username, content: "a genuinely kind note" }, ip)
    );
    expect(res.status).toBe(201);
    const msg = await MessageModel.findOne({ recipient: user._id });
    expect(msg?.senderIpHash).toBe(hashIp(ip));
  });

  it("send-message shadow-drops blocked senders", async () => {
    const ip = "198.51.100.9";
    const user = await makeUser({ blockedSenders: [hashIp(ip)] });
    const res = await sendMessage(
      postReq({ username: user.username, content: "this should be dropped" }, ip)
    );
    expect(res.status).toBe(201); // looks successful to the sender
    expect(await MessageModel.countDocuments({ recipient: user._id })).toBe(0);
  });

  // --- get-messages ----------------------------------------------------------
  it("get-messages requires auth and paginates", async () => {
    mockedSession.mockResolvedValue(null);
    const unauth = await getMessages(
      new Request("http://localhost/api/get-messages")
    );
    expect(unauth.status).toBe(401);

    const user = await makeUser();
    await MessageModel.insertMany([
      { recipient: user._id, content: "one" },
      { recipient: user._id, content: "two" },
      { recipient: user._id, content: "three" },
    ]);
    asSession(user);
    const res = await getMessages(
      new Request("http://localhost/api/get-messages?page=1&limit=2")
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.messages).toHaveLength(2);
    expect(body.total).toBe(3);
    expect(body.hasMore).toBe(true);
  });

  it("get-messages supports search and sort", async () => {
    const user = await makeUser();
    const base = Date.now();
    await MessageModel.insertMany([
      { recipient: user._id, content: "apple pie", createdAt: new Date(base - 3000) },
      { recipient: user._id, content: "banana bread", createdAt: new Date(base - 2000) },
      { recipient: user._id, content: "cherry cake", createdAt: new Date(base - 1000) },
    ]);
    asSession(user);

    // search
    const search = await getMessages(
      new Request("http://localhost/api/get-messages?q=banana")
    );
    const searchBody = await search.json();
    expect(searchBody.total).toBe(1);
    expect(searchBody.messages[0].content).toBe("banana bread");

    // search is case-insensitive
    const ci = await getMessages(
      new Request("http://localhost/api/get-messages?q=CHERRY")
    );
    expect((await ci.json()).total).toBe(1);

    // sort oldest-first
    const oldest = await getMessages(
      new Request("http://localhost/api/get-messages?sort=oldest")
    );
    expect((await oldest.json()).messages[0].content).toBe("apple pie");
  });

  // --- delete-message (ownership) -------------------------------------------
  it("delete-message is scoped to the owner", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const msg = await MessageModel.create({
      recipient: owner._id,
      content: "owned message",
    });

    // Another user cannot delete it.
    asSession(other);
    const denied = await deleteMessage(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ messageid: String(msg._id) }),
    });
    expect(denied.status).toBe(404);
    expect(await MessageModel.findById(msg._id)).toBeTruthy();

    // The owner can.
    asSession(owner);
    const ok = await deleteMessage(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ messageid: String(msg._id) }),
    });
    expect(ok.status).toBe(200);
    expect(await MessageModel.findById(msg._id)).toBeNull();
  });

  // --- block-sender ----------------------------------------------------------
  it("block-sender purges the sender and records the block", async () => {
    const user = await makeUser();
    const hash = hashIp("192.0.2.55");
    await MessageModel.insertMany([
      { recipient: user._id, content: "a", senderIpHash: hash },
      { recipient: user._id, content: "b", senderIpHash: hash },
      { recipient: user._id, content: "c", senderIpHash: hashIp("192.0.2.99") },
    ]);
    const target = await MessageModel.findOne({
      recipient: user._id,
      senderIpHash: hash,
    });

    asSession(user);
    const res = await blockSender(postReq({ messageId: String(target!._id) }));
    expect(res.status).toBe(200);
    // Only the other sender's message survives.
    expect(await MessageModel.countDocuments({ recipient: user._id })).toBe(1);
    const after = await UserModel.findById(user._id);
    expect(after!.blockedSenders).toContain(hash);
  });

  // --- stats -----------------------------------------------------------------
  it("stats returns totals and a 14-day daily series", async () => {
    mockedSession.mockResolvedValue(null);
    expect((await getStats()).status).toBe(401);

    const user = await makeUser();
    const now = Date.now();
    await MessageModel.insertMany([
      { recipient: user._id, content: "today one", createdAt: new Date(now) },
      { recipient: user._id, content: "today two", createdAt: new Date(now) },
      {
        recipient: user._id,
        content: "old",
        createdAt: new Date(now - 40 * 24 * 3600 * 1000), // outside the window
      },
    ]);

    asSession(user);
    const res = await getStats();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.total).toBe(3); // total counts everything
    expect(body.today).toBe(2); // only the two from today
    expect(body.last7).toBe(2);
    expect(body.daily).toHaveLength(14);
  });

  // --- export ----------------------------------------------------------------
  it("export returns CSV (escaped) and JSON", async () => {
    const user = await makeUser();
    await MessageModel.insertMany([
      { recipient: user._id, content: 'has "quotes", and, commas' },
      { recipient: user._id, content: "plain message" },
    ]);
    asSession(user);

    const csvRes = await exportMessages(
      new Request("http://localhost/api/export?format=csv")
    );
    expect(csvRes.headers.get("Content-Type")).toContain("text/csv");
    expect(csvRes.headers.get("Content-Disposition")).toContain(".csv");
    const csv = await csvRes.text();
    expect(csv).toContain("Received,Message");
    // A field with quotes/commas must be wrapped and its quotes doubled.
    expect(csv).toContain('"has ""quotes"", and, commas"');

    const jsonRes = await exportMessages(
      new Request("http://localhost/api/export?format=json")
    );
    expect(jsonRes.headers.get("Content-Type")).toContain("application/json");
    const parsed = JSON.parse(await jsonRes.text());
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty("content");
    expect(parsed[0]).toHaveProperty("receivedAt");
  });

  // --- digest cron -----------------------------------------------------------
  it("digest cron requires the CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-cron";
    const noAuth = await sendDigests(new Request("http://localhost/api/cron"));
    expect(noAuth.status).toBe(401);
    const badAuth = await sendDigests(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer wrong" },
      })
    );
    expect(badAuth.status).toBe(401);
  });

  it("digest cron emails users with new messages and records the send", async () => {
    process.env.CRON_SECRET = "test-cron";
    (sendDigestEmail as unknown as ReturnType<typeof vi.fn>).mockClear();

    // Isolate: disable digests for every pre-existing user, then create fresh
    // fixtures (which default to digestEnabled) so only they are eligible.
    await UserModel.updateMany({}, { $set: { digestEnabled: false } });

    const withNew = await makeUser();
    await MessageModel.create({ recipient: withNew._id, content: "new one" });

    const noNew = await makeUser(); // verified, digestEnabled, but no messages

    const optedOut = await makeUser({ digestEnabled: false });
    await MessageModel.create({ recipient: optedOut._id, content: "ignored" });

    const res = await sendDigests(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer test-cron" },
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sent).toBe(1); // only the user with new messages
    expect(sendDigestEmail).toHaveBeenCalledTimes(1);

    // The sent user now has a lastDigestSentAt; the others don't.
    expect((await UserModel.findById(withNew._id))!.lastDigestSentAt).toBeTruthy();
    expect((await UserModel.findById(noNew._id))!.lastDigestSentAt).toBeFalsy();

    // A second run sends nothing new (no messages since last digest).
    const res2 = await sendDigests(
      new Request("http://localhost/api/cron", {
        headers: { authorization: "Bearer test-cron" },
      })
    );
    expect((await res2.json()).sent).toBe(0);
  });

  // --- forgot / reset password ----------------------------------------------
  it("forgot-password returns a generic response for unknown emails", async () => {
    const res = await forgotPassword(postReq({ email: "nobody@rt.test" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("reset-password changes the password with a valid code", async () => {
    const user = await makeUser({
      resetPasswordCode: "654321",
      resetPasswordCodeExpiry: new Date(Date.now() + 600000),
      resetPasswordAttempts: 0,
    });

    const wrong = await resetPassword(
      postReq({ email: user.email, code: "000000", password: "newpass123" })
    );
    expect(wrong.status).toBe(400);

    const ok = await resetPassword(
      postReq({ email: user.email, code: "654321", password: "newpass123" })
    );
    expect(ok.status).toBe(200);

    const after = await UserModel.findById(user._id);
    expect(await bcrypt.compare("newpass123", after!.password!)).toBe(true);
    expect(after!.resetPasswordCode).toBeFalsy(); // cleared
  });
});
