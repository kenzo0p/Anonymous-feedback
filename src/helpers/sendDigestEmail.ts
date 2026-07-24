import { resend } from "@/lib/resend";
import DigestEmail from "../../emails/DigestEmail";
import { ApiResponse } from "@/types/ApiResponse";

export async function sendDigestEmail(
    email: string,
    username: string,
    count: number
): Promise<ApiResponse> {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    try {
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: `You have ${count} new anonymous message${count === 1 ? "" : "s"} on Whistr`,
            react: DigestEmail({
                username,
                count,
                dashboardUrl: `${baseUrl}/dashboard`,
            }),
        });
        return { success: true, message: "Digest email sent successfully" };
    } catch (emailError) {
        console.error("Error sending digest email", emailError);
        return { success: false, message: "Failed to send digest email" };
    }
}
