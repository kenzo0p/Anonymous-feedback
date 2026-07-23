import UserModel from "@/model/User.model";
import dbConnect from "@/lib/dbConnect";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";

const MAX_VERIFY_ATTEMPTS = 5;

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { username, code } = await request.json();
    const decodedUsername = decodeURIComponent(username ?? "");

    // Throttle submissions by IP + username to slow brute force.
    const { success, reset } = await ratelimit.verify.limit(
      `${getClientIp(request)}:${decodedUsername}`
    );
    if (!success) return tooManyRequests(reset);

    const user = await UserModel.findOne({ username: decodedUsername });
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return Response.json(
        { success: true, message: "Account is already verified" },
        { status: 200 }
      );
    }

    const isCodeNotExpired = new Date(user.verifyCodeExpiry ?? 0) > new Date();
    if (!isCodeNotExpired) {
      return Response.json(
        {
          success: false,
          message:
            "Verification code has expired. Please sign up again to get a new code.",
        },
        { status: 400 }
      );
    }

    // Hard attempt cap: once exceeded, invalidate the code entirely so the
    // remaining 6-digit space can't be brute-forced.
    if ((user.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
      user.verifyCodeExpiry = new Date(0);
      await user.save();
      return Response.json(
        {
          success: false,
          message:
            "Too many incorrect attempts. Please sign up again to get a new code.",
        },
        { status: 429 }
      );
    }

    if (user.verifyCode === code) {
      user.isVerified = true;
      user.verifyAttempts = 0;
      await user.save();
      return Response.json(
        { success: true, message: "Account verified successfully" },
        { status: 200 }
      );
    }

    // Wrong code — count it against the cap.
    user.verifyAttempts = (user.verifyAttempts ?? 0) + 1;
    await user.save();
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - user.verifyAttempts);
    return Response.json(
      {
        success: false,
        message: `Incorrect verification code. ${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining.`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error verifying user", error);
    return Response.json(
      { success: false, message: "Error verifying user" },
      { status: 500 }
    );
  }
}
