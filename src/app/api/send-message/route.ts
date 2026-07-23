import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const { success, reset } = await ratelimit.sendMessage.limit(
    getClientIp(request)
  );
  if (!success) return tooManyRequests(reset);

  await dbConnect();
  const { username, content } = await request.json();
  try {
    const user = await UserModel.findOne({ username }).select("_id isAcceptingMessages");
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
    await MessageModel.create({ recipient: user._id, content });
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
