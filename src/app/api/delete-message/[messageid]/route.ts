import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import UserModel from "@/model/User.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";


export async function DELETE(
  request: Request,
  { params }: { params: { messageid: string } }
) {
  const messageId = params.messageid;
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user) {
    return Response.json(
      { success: false, message: "User is not autheticated" },
      { status: 400 }
    );
  }
  try {
    const updateResult = await UserModel.updateOne(
      { _id: _user._id },
      { $pull: { messages: { _id: messageId } } }
    );
    if (updateResult.modifiedCount == 0) {
      return Response.json(
        { success: false, message: "Message not found or already deleted" },
        { status: 404 }
      );
    }
    return Response.json(
      { success: true, message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log("error in delete messge route", error);
    return Response.json(
      { success: false, message: "Error in deleting message" },
      { status: 500 }
    );
  }
}
