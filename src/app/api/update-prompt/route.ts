import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { User } from "next-auth";
import { updatePromptSchema } from "@/schemas/updatePromptSchema";
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
  const user = await UserModel.findById(_user._id).select("prompt");
  return Response.json(
    { success: true, message: "ok", prompt: user?.prompt ?? "" },
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
    const parsed = updatePromptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Invalid prompt",
        },
        { status: 400 }
      );
    }

    await UserModel.findByIdAndUpdate(_user._id, {
      prompt: parsed.data.prompt.trim(),
    });
    return Response.json(
      { success: true, message: "Prompt updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating prompt", error);
    return Response.json(
      { success: false, message: "Error updating prompt" },
      { status: 500 }
    );
  }
}
