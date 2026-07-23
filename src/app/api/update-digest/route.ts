import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { User } from "next-auth";
import { ratelimit, tooManyRequests } from "@/lib/ratelimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }
  await dbConnect();
  const user = await UserModel.findById(_user._id).select("digestEnabled");
  return Response.json(
    { success: true, message: "ok", digestEnabled: user?.digestEnabled ?? true },
    { status: 200 }
  );
}

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
    const { enabled } = await request.json();
    await UserModel.findByIdAndUpdate(_user._id, {
      digestEnabled: Boolean(enabled),
    });
    return Response.json(
      {
        success: true,
        message: enabled ? "Digest emails enabled" : "Digest emails disabled",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating digest preference", error);
    return Response.json(
      { success: false, message: "Error updating preference" },
      { status: 500 }
    );
  }
}
