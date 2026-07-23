import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import { sendDigestEmail } from "@/helpers/sendDigestEmail";

// Vercel Cron issues a GET and (when CRON_SECRET is set) includes it as a
// bearer token. Any external scheduler can call this the same way.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  await dbConnect();
  try {
    const users = await UserModel.find({
      isVerified: true,
      digestEnabled: true,
    }).select("_id email username lastDigestSentAt");

    let sent = 0;
    for (const user of users) {
      const since = user.lastDigestSentAt ?? new Date(0);
      const count = await MessageModel.countDocuments({
        recipient: user._id,
        createdAt: { $gt: since },
      });
      if (count > 0) {
        await sendDigestEmail(user.email, user.username, count);
        user.lastDigestSentAt = new Date();
        await user.save();
        sent += 1;
      }
    }

    return Response.json(
      { success: true, processed: users.length, sent },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending digests:", error);
    return Response.json(
      { success: false, message: "Failed to send digests" },
      { status: 500 }
    );
  }
}
