import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import MessageModel from "@/model/Message.model";
import dbConnect from "@/lib/dbConnect";
import { User } from "next-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageid: string }> }
) {
  const { messageid: messageId } = await params;
  await dbConnect();
  const session = await getServerSession(authOptions);
  const _user: User = session?.user;
  if (!session || !_user?._id) {
    return Response.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }
  try {
    // Scope the delete to the owner so a user can only delete their own messages.
    const result = await MessageModel.deleteOne({
      _id: messageId,
      recipient: _user._id,
    });
    if (result.deletedCount === 0) {
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
    console.error("Error in delete message route", error);
    return Response.json(
      { success: false, message: "Error in deleting message" },
      { status: 500 }
    );
  }
}
