/**
 * Dev-only: seed a verified user with a batch of messages to exercise the
 * dashboard + pagination against a local MongoDB. Not for production.
 *   node --env-file=.env scripts/seed-test-user.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (pass it via --env-file=.env).");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const users = db.collection("users");
const messages = db.collection("messages");

const username = "alex";
const now = new Date();
const password = await bcrypt.hash("password123", 10);

await users.deleteOne({ username });
await messages.deleteMany({});

const { insertedId } = await users.insertOne({
  username,
  email: "alex@example.com",
  password,
  verifyCode: "000000",
  verifyCodeExpiry: now,
  isVerified: true,
  isAcceptingMessages: true,
  createdAt: now,
  updatedAt: now,
});

const docs = Array.from({ length: 25 }, (_, i) => {
  const when = new Date(now.getTime() - i * 60000);
  return {
    recipient: insertedId,
    content: `Test message #${25 - i} — anonymous feedback sample number ${25 - i}.`,
    // Two distinct fake senders so the block-and-purge flow is demonstrable.
    senderIpHash: i % 2 === 0 ? "seed-sender-a" : "seed-sender-b",
    createdAt: when,
    updatedAt: when,
  };
});
await messages.insertMany(docs);
await messages.createIndex({ recipient: 1, createdAt: -1 });
await messages.createIndex({ recipient: 1, senderIpHash: 1 });

console.log(
  `Seeded @${username} (login: alex@example.com / password123) with ${docs.length} messages.`
);
await mongoose.disconnect();
