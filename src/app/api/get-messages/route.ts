import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT)
  );

  try {
    const filter = { recipient: _user._id };
    const [messages, total] = await Promise.all([
      MessageModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MessageModel.countDocuments(filter),
    ]);

    return Response.json(
      {
        success: true,
        messages,
        total,
        page,
        hasMore: page * limit < total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
