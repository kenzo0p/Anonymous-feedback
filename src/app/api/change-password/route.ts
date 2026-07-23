import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
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
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return Response.json(
        { success: false, message: "Invalid password input" },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(_user._id);
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.password) {
      return Response.json(
        {
          success: false,
          message: "Your account uses social sign-in and has no password.",
        },
        { status: 400 }
      );
    }
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return Response.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return Response.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error changing password", error);
    return Response.json(
      { success: false, message: "Error changing password" },
      { status: 500 }
    );
  }
}
