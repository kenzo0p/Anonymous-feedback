import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";
import { containsBlockedContent } from "@/lib/moderation";
import { hashIp } from "@/lib/hashIp";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success, reset } = await ratelimit.sendMessage.limit(ip);
  if (!success) return tooManyRequests(reset);

  await dbConnect();
  const { username, content } = await request.json();
  try {
    // Content filter — reject obvious spam / blocked terms.
    if (typeof content === "string" && containsBlockedContent(content)) {
      return Response.json(
        {
          success: false,
          message: "Your message couldn't be sent — it contains blocked content.",
        },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ username }).select(
      "_id isAcceptingMessages blockedSenders"
    );
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    // is user accepting the messages
    if (!user.isAcceptingMessages) {
      return Response.json(
        { success: false, message: "User is not accepting messages" },
        { status: 403 }
      );
    }

    const senderIpHash = hashIp(ip);

    // Shadow-drop messages from blocked senders: respond as normal so the
    // blocked sender can't tell, but never store the message.
    if (user.blockedSenders?.includes(senderIpHash)) {
      return Response.json(
        { success: true, message: "Message sent successfully" },
        { status: 201 }
      );
    }

    await MessageModel.create({ recipient: user._id, content, senderIpHash });
    return Response.json(
      { success: true, message: "Message sent successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding message", error);
    return Response.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
