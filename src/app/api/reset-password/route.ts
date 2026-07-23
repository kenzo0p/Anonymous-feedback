import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { resetPasswordSchema } from "@/schemas/resetPasswordSchema";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";

const MAX_RESET_ATTEMPTS = 5;

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          message:
            parsed.error.issues[0]?.message ?? "Invalid reset request",
        },
        { status: 400 }
      );
    }
    const { email, code, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const { success, reset } = await ratelimit.resetPassword.limit(
      `${getClientIp(request)}:${normalizedEmail}`
    );
    if (!success) return tooManyRequests(reset);

    const user = await UserModel.findOne({ email: normalizedEmail });

    // Generic failure for missing user / no pending reset — avoids enumeration.
    if (!user || !user.resetPasswordCode || !user.resetPasswordCodeExpiry) {
      return Response.json(
        { success: false, message: "Invalid or expired reset code." },
        { status: 400 }
      );
    }

    if (new Date(user.resetPasswordCodeExpiry) <= new Date()) {
      return Response.json(
        {
          success: false,
          message: "Reset code has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Hard attempt cap: invalidate the code once exceeded.
    if ((user.resetPasswordAttempts ?? 0) >= MAX_RESET_ATTEMPTS) {
      user.resetPasswordCode = undefined;
      user.resetPasswordCodeExpiry = undefined;
      await user.save();
      return Response.json(
        {
          success: false,
          message:
            "Too many incorrect attempts. Please request a new reset code.",
        },
        { status: 429 }
      );
    }

    if (user.resetPasswordCode !== code) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts ?? 0) + 1;
      await user.save();
      const remaining = Math.max(
        0,
        MAX_RESET_ATTEMPTS - user.resetPasswordAttempts
      );
      return Response.json(
        {
          success: false,
          message: `Invalid reset code. ${remaining} attempt${
            remaining === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 400 }
      );
    }

    // Success — set the new password and clear the reset state.
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpiry = undefined;
    user.resetPasswordAttempts = 0;
    await user.save();

    return Response.json(
      { success: true, message: "Password reset successfully. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, message: "Invalid reset request" },
        { status: 400 }
      );
    }
    console.error("Error in reset-password", error);
    return Response.json(
      { success: false, message: "Error resetting password" },
      { status: 500 }
    );
  }
}
