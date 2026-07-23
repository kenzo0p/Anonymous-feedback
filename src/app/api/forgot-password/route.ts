import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import { sendResetPasswordEmail } from "@/helpers/sendResetPasswordEmail";
import { ratelimit, getClientIp, tooManyRequests } from "@/lib/ratelimit";

// Generic response so we never reveal whether an email is registered.
const GENERIC = {
  success: true,
  message:
    "If an account exists for that email, a reset code has been sent.",
};

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  const normalizedEmail = String(email ?? "").toLowerCase().trim();

  const { success, reset } = await ratelimit.forgotPassword.limit(
    `${getClientIp(request)}:${normalizedEmail}`
  );
  if (!success) return tooManyRequests(reset);

  await dbConnect();
  try {
    const user = await UserModel.findOne({ email: normalizedEmail });
    // Only send to verified accounts; always return the generic response.
    if (user && user.isVerified) {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordCode = resetCode;
      user.resetPasswordCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
      user.resetPasswordAttempts = 0;
      await user.save();
      await sendResetPasswordEmail(user.email, user.username, resetCode);
    }
    return Response.json(GENERIC, { status: 200 });
  } catch (error) {
    console.error("Error in forgot-password", error);
    // Still generic to the client.
    return Response.json(GENERIC, { status: 200 });
  }
}
