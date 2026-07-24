import { resend } from "@/lib/resend";
import PasswordResetEmail from "../../emails/PasswordResetEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendResetPasswordEmail(
    email: string,
    username: string,
    resetCode: string
): Promise<ApiResponse> {
    try {
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Whistr | Password reset code",
            react: PasswordResetEmail({ username, otp: resetCode }),
        });
        return { success: true, message: "Password reset email sent successfully" };
    } catch (emailError) {
        console.error("Error sending password reset email", emailError);
        return { success: false, message: "Failed to send password reset email" };
    }
}
