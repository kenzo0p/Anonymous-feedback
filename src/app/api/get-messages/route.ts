import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";
import type { FilterQuery } from "mongoose";
import type { Message } from "@/model/Message.model";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 100;

// Escape regex metacharacters so a search term can't become a pattern (ReDoS).
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const q = (searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  const sortDir = searchParams.get("sort") === "oldest" ? 1 : -1;

  try {
    const filter: FilterQuery<Message> = { recipient: _user._id };
    if (q) {
      filter.content = { $regex: escapeRegex(q), $options: "i" };
    }
    const [messages, total] = await Promise.all([
      MessageModel.find(filter)
        .sort({ createdAt: sortDir })
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
