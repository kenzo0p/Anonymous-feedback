import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";

const uri = process.env.MONGODB_URI;

// Only runs when a database is available (e.g. CI with a Mongo service).
describe.skipIf(!uri)("models (integration)", () => {
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    await mongoose.connect(uri as string);
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: new RegExp(`@${suffix}\\.test$`) });
    await mongoose.disconnect();
  });

  it("applies User schema defaults", async () => {
    const user = await UserModel.create({
      username: `u_${suffix}`,
      email: `u@${suffix}.test`,
      password: "hashed",
      verifyCode: "123456",
      verifyCodeExpiry: new Date(Date.now() + 3600000),
    });
    expect(user.isVerified).toBe(false);
    expect(user.isAcceptingMessages).toBe(true);
    expect(user.verifyAttempts).toBe(0);
    expect(user.resetPasswordAttempts).toBe(0);
    await UserModel.deleteOne({ _id: user._id });
  });

  it("stores messages in their own collection, newest-first with pagination", async () => {
    const recipient = new mongoose.Types.ObjectId();
    const now = Date.now();
    await MessageModel.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        recipient,
        content: `message ${i}`,
        createdAt: new Date(now - i * 1000),
      }))
    );

    const page1 = await MessageModel.find({ recipient })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();
    expect(page1).toHaveLength(2);
    expect(page1[0].content).toBe("message 0"); // newest first
    expect(page1[0]).toHaveProperty("createdAt");

    const total = await MessageModel.countDocuments({ recipient });
    expect(total).toBe(5);

    await MessageModel.deleteMany({ recipient });
  });

  it("creates the recipient inbox index", async () => {
    const indexes = await MessageModel.collection.indexes();
    const names = indexes.map((i) => i.name);
    expect(names).toContain("recipient_1_createdAt_-1");
  });
});
