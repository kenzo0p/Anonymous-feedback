import mongoose, { Schema, Document } from "mongoose";

export interface Message extends Document {
  recipient: mongoose.Types.ObjectId;
  content: string;
  senderIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema: Schema<Message> = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    // Salted hash of the sender's IP — lets a recipient block a sender without
    // us storing the raw IP. Never returned to the client.
    senderIpHash: {
      type: String,
    },
  },
  { timestamps: true }
);

// Fast inbox reads: fetch a recipient's messages newest-first, paginated.
messageSchema.index({ recipient: 1, createdAt: -1 });
// Purge queries when a sender is blocked.
messageSchema.index({ recipient: 1, senderIpHash: 1 });

const MessageModel =
  (mongoose.models.Message as mongoose.Model<Message>) ||
  mongoose.model<Message>("Message", messageSchema);

export default MessageModel;
