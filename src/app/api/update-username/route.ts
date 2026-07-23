import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { User } from "next-auth";
import { updateUsernameSchema } from "@/schemas/updateUsernameSchema";
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
    const body = await request.json();
    const parsed = updateUsernameSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Invalid username",
        },
        { status: 400 }
      );
    }
    const { username } = parsed.data;

    if (username === _user.username) {
      return Response.json(
        { success: false, message: "That is already your username" },
        { status: 400 }
      );
    }

    // Reject if taken by any other account.
    const existing = await UserModel.findOne({ username });
    if (existing && existing._id?.toString() !== _user._id) {
      return Response.json(
        { success: false, message: "Username is already taken" },
        { status: 409 }
      );
    }

    const updated = await UserModel.findByIdAndUpdate(
      _user._id,
      { username },
      { new: true }
    );
    if (!updated) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return Response.json(
      { success: true, message: "Username updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating username", error);
    return Response.json(
      { success: false, message: "Error updating username" },
      { status: 500 }
    );
  }
}
