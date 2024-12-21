import UserModel from "@/model/User.model";
import dbConnect from "@/lib/dbConnect";
import { Message } from "@/model/User.model";
import { create } from "domain";
export async function POST(request:Request){
    await dbConnect()
    const {username,content} = await request.json()
    try {
        const user = await UserModel.findOne({username})
        if(!user) {
            return Response.json({success:false ,message:"User found"},{status:404})
        }
        // is user accepting the messages
        if(!user.isAcceptingMessage){
            return Response.json({success:false ,message:"User is not accepting messages"},{status:400})
        }
        const newMessage = {content , createdAt:new Date()}
        user.messages.push(newMessage as Message) //aserting as Message
        await user.save()
        return Response.json({success:true , message:"message sent successfully"},{status:200})
    } catch (error) {
        console.error("Error adding mesages" , error)
        return Response.json({success:false , message:"Internal server error"},{status:500})
    }
}