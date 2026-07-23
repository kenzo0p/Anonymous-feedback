import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import MessageModel from "@/model/Message.model";
import bcrypt from "bcryptjs";
import { User } from "next-auth";
import { ratelimit, tooManyRequests } from "@/lib/ratelimit";

export async function DELETE(request: Request) {
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
    const { password } = await request.json().catch(() => ({}));

    const user = await UserModel.findById(_user._id);
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Require the current password to confirm a destructive action.
    const isValid = await bcrypt.compare(String(password ?? ""), user.password);
    if (!isValid) {
      return Response.json(
        { success: false, message: "Password is incorrect" },
        { status: 400 }
      );
    }

    await MessageModel.deleteMany({ recipient: user._id });
    await UserModel.deleteOne({ _id: user._id });

    return Response.json(
      { success: true, message: "Account deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting account", error);
    return Response.json(
      { success: false, message: "Error deleting account" },
      { status: 500 }
    );
  }
}
