/**
 * One-off backfill: move embedded `users.messages[]` into the standalone
 * `messages` collection introduced by the messages-collection migration.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-messages.mjs           # copy only (safe)
 *   PRUNE=1 node --env-file=.env scripts/migrate-messages.mjs   # copy, then remove old arrays
 *
 * This is idempotent-unfriendly: running the copy step twice will duplicate
 * messages. Run once, verify counts, then re-run with PRUNE=1 to clean up.
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required (pass it via --env-file=.env).");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const users = db.collection("users");
const messages = db.collection("messages");

// Ensure the inbox index exists (the Mongoose model creates it lazily, but the
// native inserts below bypass the model).
await messages.createIndex({ recipient: 1, createdAt: -1 });

let migrated = 0;
let usersTouched = 0;

const cursor = users.find({ messages: { $exists: true, $ne: [] } });
for await (const user of cursor) {
  const docs = (user.messages || []).map((m) => {
    const when = m.createdAt ? new Date(m.createdAt) : new Date();
    return {
      recipient: user._id,
      content: m.content,
      createdAt: when,
      updatedAt: when,
    };
  });
  if (docs.length) {
    await messages.insertMany(docs);
    migrated += docs.length;
    usersTouched += 1;
  }
}

console.log(`Copied ${migrated} messages across ${usersTouched} users.`);

if (process.env.PRUNE === "1") {
  const res = await users.updateMany({}, { $unset: { messages: "" } });
  console.log(`Pruned embedded arrays from ${res.modifiedCount} user docs.`);
} else {
  console.log(
    "Embedded arrays left intact. Re-run with PRUNE=1 once you've verified the copy."
  );
}

await mongoose.disconnect();
