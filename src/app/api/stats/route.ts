import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";
import mongoose from "mongoose";

const WINDOW_DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  const recipient = new mongoose.Types.ObjectId(_user._id);

  // Start of the 14-day window (UTC midnight).
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));

  try {
    const [total, grouped] = await Promise.all([
      MessageModel.countDocuments({ recipient }),
      MessageModel.aggregate<{ _id: string; count: number }>([
        { $match: { recipient, createdAt: { $gte: start } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = new Map(grouped.map((g) => [g._id, g.count]));

    // Build a zero-filled series for every day in the window.
    const daily: { date: string; count: number }[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = dayKey(d);
      daily.push({ date: key, count: counts.get(key) ?? 0 });
    }

    const today = daily[daily.length - 1]?.count ?? 0;
    const last7 = daily.slice(-7).reduce((sum, d) => sum + d.count, 0);

    return Response.json(
      { success: true, total, today, last7, daily },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error computing stats:", error);
    return Response.json(
      { success: false, message: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
