import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import { User } from "next-auth";
import { ratelimit, tooManyRequests } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  const { success, reset } = await ratelimit.account.limit(_user._id);
  if (!success) return tooManyRequests(reset);

  await dbConnect();
  try {
    const { messageId } = await request.json();

    // Look up the message, scoped to the owner.
    const message = await MessageModel.findOne({
      _id: messageId,
      recipient: _user._id,
    }).select("senderIpHash");
    if (!message) {
      return Response.json(
        { success: false, message: "Message not found" },
        { status: 404 }
      );
    }
    if (!message.senderIpHash) {
      return Response.json(
        {
          success: false,
          message: "This message predates sender tracking and can't be blocked.",
        },
        { status: 400 }
      );
    }

    // Block the sender and purge everything they've sent to this inbox.
    await UserModel.updateOne(
      { _id: _user._id },
      { $addToSet: { blockedSenders: message.senderIpHash } }
    );
    const purge = await MessageModel.deleteMany({
      recipient: _user._id,
      senderIpHash: message.senderIpHash,
    });

    return Response.json(
      {
        success: true,
        message: `Sender blocked. Removed ${purge.deletedCount} message${
          purge.deletedCount === 1 ? "" : "s"
        }.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error blocking sender", error);
    return Response.json(
      { success: false, message: "Error blocking sender" },
      { status: 500 }
    );
  }
}
