import { sendVerificationEmail } from "@/helpers/sendVerificationEmail";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User.model";
import bcrypt from "bcryptjs";

export async function POST(request:Request) {
    await dbConnect()
    try {
        const {username,email,password} = await request.json();
        
    } catch (error) {
        console.error("Error while registering user")
        return Response.json({
            success:false,
            message:"Error while registering the user",
        },{status:500})
    }
}