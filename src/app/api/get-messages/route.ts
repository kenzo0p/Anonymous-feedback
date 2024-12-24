import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import UserModel from "@/model/User.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";
import mongoose from "mongoose";

export async function GET(request: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user) {
    return Response.json(
      { success: false, message: "User is not autheticated" },
      { status: 400 }
    );
  }
  const userId = new mongoose.Types.ObjectId(_user._id);
  if (!userId) {
    return Response.json(
      { success: false, message: "User ID is not provided" },
      { status: 400 }
    );
  }
  try {
    const user = await UserModel.aggregate([
      {
        $match: { _id: userId },
      },
      {
        $unwind: '$messages',
      },
      {
        $sort: { 'messages.createdAt': -1 },
      },
      { $group: { _id: '$_id', messages: { $push: '$messages' } } },
    ]).exec();

    if (!user || user.length === 0) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    return Response.json(
      { success: true, messages: user[0].messages},
      { status: 200, }
    );
  } catch (error) {
    console.log("An unexpected error occured:", error);
    return Response.json(
      { success: false, message: "not authenticated" },
      { status: 500 }
    );
  }
}
